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
          const material = new THREE.MeshBasicMaterial({ color: link.color });
          const linkSphere = new THREE.Mesh(geometry, material);

          let position: THREE.Vector3;
          let isOverlapping: boolean;
          let attempts = 0;
          const maxAttempts = 100;
          do {
            if (link.depth === 1) {
              position = new THREE.Vector3(
                Math.random() * 100 - 50 + link.size,
                Math.random() * 100 - 50 + link.size,
                Math.random() * 100 - 50 + link.size
              );
            } else {
              const parentSphere = spheresByUrl.get(link.parent);
              if (!parentSphere) {
                console.warn(`Parent sphere for link ${link.url} not found. Skipping...`);
                return;
              }
              const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                -5,
                (Math.random() - 0.5) * 15
              );
              position = new THREE.Vector3().addVectors(parentSphere.position, offset);
            }

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
        });
      });

      knownMap.forEach((parentLink) => {
        parentLink.links.forEach((link) => {
          if (link.parent) {
            const parentSphere = spheresByUrl.get(link.parent);
            const linkSphere = spheresByUrl.get(link.url);
            if (parentSphere && linkSphere) {
              const material = new THREE.MeshBasicMaterial({
                color: link.color,
              });

              const direction = new THREE.Vector3().subVectors(linkSphere.position, parentSphere.position);
              const orientation = new THREE.Matrix4();
              orientation.lookAt(parentSphere.position, linkSphere.position, new THREE.Object3D().up);
              orientation.multiply(new THREE.Matrix4().set(
                1, 0, 0, 0,
                0, 0, 1, 0,
                0, -1, 0, 0,
                0, 0, 0, 1
              ));

              const edgeGeometry = new THREE.CylinderGeometry(link.lineWidth, link.lineWidth, direction.length(), 8, 1);
              edgeGeometry.applyMatrix4(orientation);

              const position = new THREE.Vector3().addVectors(parentSphere.position, linkSphere.position).divideScalar(2);
              const edge = new THREE.Mesh(edgeGeometry, material);
              edge.position.set(position.x, position.y, position.z);
              scene.add(edge);
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
      };
    }
  }, [isLoading, knownMap]);

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
