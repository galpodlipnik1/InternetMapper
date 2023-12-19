import { useEffect, useRef, useState, FC } from 'react';
import { createLink, getLinks } from '../actions/links';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type LinkType = {
  url: string;
  depth: number;
  color: number;
  size: number;
  lineWidth: number;
  links: string[];
  parent: string;
};

type KnownMapType = {
  parent: string;
  links: LinkType[];
}[];

const Home: FC = () => {
  const [knownMap, setKnownMap] = useState<KnownMapType>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLink, setSelectedLink] = useState<{ url: string; parent: string } | null>(null);
  const [addLink, setAddLink] = useState<{ url: string; depth: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [highlightedSphere, setHighlightedSphere] = useState<THREE.Mesh | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spheresRef = useRef<THREE.Mesh[]>([]);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  useEffect(() => {
    const getLinksData = async () => {
      const links = await getLinks();
      setKnownMap(links);
      setIsLoading(false);
    };

    getLinksData();
  }, []);

  useEffect(() => {
    if (!isLoading && containerRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 20;

      const renderer = new THREE.WebGLRenderer();

      renderer.setSize(window.innerWidth, window.innerHeight);
      containerRef.current.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);

      const spheresByUrl = new Map<string, THREE.Mesh>();

      knownMap.forEach((parentLink) => {
        parentLink.links.forEach((link) => {
          const geometry = new THREE.SphereGeometry(link.size, 32, 32);
          const material = new THREE.MeshBasicMaterial({
            color: link.url === searchQuery ? 0xffff00 : link.color
          });
          const linkSphere = new THREE.Mesh(geometry, material);

          // Initialize position with a default value
          let position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
          let isOverlapping: boolean;
          let attempts = 0;
          const maxAttempts = 100; // Maximum number of attempts to position a sphere

          // If the link has a parent, adjust its position based on the parent's position
          if (link.parent) {
            const parentUrls = link.parent.split(','); // Assuming parents are comma-separated
            const parentSpheres = parentUrls
              .map((url) => spheresByUrl.get(url))
              .filter(Boolean) as THREE.Mesh[];
            if (parentSpheres.length > 0) {
              position = parentSpheres
                .reduce((sum, parentSphere) => {
                  sum.add(parentSphere.position);
                  return sum;
                }, new THREE.Vector3())
                .divideScalar(parentSpheres.length);
            }
          }

          do {
            // Randomize position around the average parent position
            position.add(
              new THREE.Vector3(
                Math.random() * 20 - 10, // randomize x-coordinate around the average parent position
                Math.random() * 20 - 10, // randomize y-coordinate around the average parent position
                Math.random() * 20 - 10 // randomize z-coordinate around the average parent position
              )
            );

            isOverlapping = Array.from(spheresByUrl.values()).some((existingSphere) => {
              const distance = existingSphere.position.distanceTo(position);

              const sphereGeometry = existingSphere.geometry as THREE.SphereGeometry;

              return distance < sphereGeometry.parameters.radius + link.size;
            });

            attempts++;
          } while (isOverlapping && attempts < maxAttempts);

          if (attempts === maxAttempts) {
            console.warn(
              'Could not position a sphere without overlapping after maximum attempts. Skipping...'
            );
            return;
          }

          linkSphere.position.copy(position);

          linkSphere.userData = { url: link.url, parent: link.parent };
          spheresRef.current.push(linkSphere);
          scene.add(linkSphere);

          spheresByUrl.set(link.url, linkSphere);

          if (link.url === searchQuery) {
            setHighlightedSphere(linkSphere);
            camera.lookAt(linkSphere.position);
          }
        });
      });

      knownMap.forEach((parentLink) => {
        parentLink.links.forEach((link) => {
          if (link.parent) {
            const parentSphere = spheresByUrl.get(link.parent);
            const linkSphere = spheresByUrl.get(link.url);
            if (parentSphere && linkSphere) {
              const material = new THREE.LineBasicMaterial({
                color: link.color,
                linewidth: link.lineWidth
              });
              const geometry = new THREE.BufferGeometry().setFromPoints([
                parentSphere.position,
                linkSphere.position
              ]);
              const line = new THREE.Line(geometry, material);
              line.computeLineDistances();
              scene.add(line);
            }
          }
        });
      });

      const animate = function () {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      containerRef.current.addEventListener('mousemove', (event) => {
        event.preventDefault();

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Assuming spheresRef.current is an array of all objects in the scene
        const spheres = spheresRef.current.filter((object) => object instanceof THREE.Mesh);

        const intersects = raycaster.intersectObjects(spheres, true);

        if (intersects.length > 0) {
          const firstIntersect = intersects[0];
          const url = firstIntersect.object.userData.url;
          const parent = firstIntersect.object.userData.parent;
          setSelectedLink({ url, parent });
        } else {
          setSelectedLink(null);
        }
      });

      return () => {
        while (containerRef.current?.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        if (highlightedSphere && highlightedSphere.material instanceof THREE.MeshBasicMaterial) {
          highlightedSphere.material.color.set(0xffffff);
        }
      };
    }
  }, [isLoading, knownMap, searchQuery]);

  return isLoading ? (
    <div>Loading...</div>
  ) : (
    <div className="flex">
      <div className="fixed top-2 left-2 bg-white p-6 rounded-lg shadow-xl flex flex-col space-y-4">
        <input
          className="border-2 border-gray-300 bg-white px-5 h-10 w-60 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          type="text"
          name="search"
          placeholder="Add a website(e.g. google.com)"
          onChange={(e) =>
            setAddLink((prev) => ({
              url: e.target.value,
              depth: prev ? prev.depth : 0
            }))
          }
        />
        <input
          className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          type="number"
          name="search"
          min="1"
          max="4"
          placeholder="Add the depth"
          onChange={(e) =>
            setAddLink((prev) => ({
              url: prev ? prev.url : '',
              depth: parseInt(e.target.value)
            }))
          }
        />
        <button
          onClick={() => {
            createLink(addLink?.url ?? '', addLink?.depth ?? 0);
            setAddLink(null);
            alert('Link added successfully!. can take a few minutes to update');
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-110"
          type="button"
        >
          Add
        </button>
        <input
          className="border-2 border-gray-300 bg-white h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          type="text"
          name="search"
          placeholder="Search a website(e.g. google.com)"
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button
          onClick={() => setSearchQuery(searchInput)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-110"
          type="button"
        >
          Search
        </button>
      </div>
      <div ref={containerRef}>
        {selectedLink && (
          <div className="fixed top-2 right-2 bg-white p-6 rounded-lg shadow-xl">
            <button
              onClick={() => setSelectedLink(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              X
            </button>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">URL</h2>
            <p className="text-gray-600 text-lg mb-4">{selectedLink.url}</p>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Parent</h2>
            <p className="text-gray-600 text-lg">{selectedLink.parent}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
