import { useEffect, useRef, FC } from 'react';
import { getLinks } from '../actions/links';
import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const Home: FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  let clickableObjects: THREE.Object3D[] = [];

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(window.innerWidth, window.innerHeight);

    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMouseClick(event: MouseEvent) {
      event.preventDefault();

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(clickableObjects);

      if (intersects.length > 0) {
        const firstIntersection = intersects[0];
        const clickedObject = firstIntersection.object;

        if (clickedObject.userData && clickedObject.userData.url) {
          alert(`Clicked on: ${clickedObject.userData.url}`);
        }
      }
    }

    window.addEventListener('click', onMouseClick);

    const getLinksData = async () => {
      const links: any[] = await getLinks();
      console.log(links);

      const urlToSphere: Record<string, THREE.Mesh> = {};

      links.forEach((link: any, index: number) => {
        let sphere: THREE.Mesh;

        if (urlToSphere[link.url]) {
          sphere = urlToSphere[link.url];
          if (
            'color' in sphere.material &&
            (sphere.material as THREE.MeshBasicMaterial).color.getHex() !== 0x00ff00
          ) {
            (sphere.material as THREE.MeshBasicMaterial).color.setHex(0x0000ff);
          }
        } else {
          const geometry = new THREE.SphereGeometry(3, 64, 64); // Green spheres with radius 1
          const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
          sphere = new THREE.Mesh(geometry, material);

          sphere.position.x = 0;
          sphere.position.y = 0; // Adjust the y position here
          sphere.position.z = 100 - index * 5; // Adjust the z position here

          sphere.userData = { url: link.url, radius: geometry.parameters.radius };

          scene.add(sphere);
          clickableObjects.push(sphere);
          urlToSphere[link.url] = sphere;
        }

        const addedLinks: string[] = [];

        link.links.forEach((subLink: any) => {
          if (addedLinks.includes(subLink) || subLink === link.url) return;
        
          let subSphere: THREE.Mesh;
        
          if (urlToSphere[subLink]) {
            subSphere = urlToSphere[subLink];
            if ('color' in subSphere.material && (subSphere.material as THREE.MeshBasicMaterial).color.getHex() === 0xff0000) {
              subSphere.geometry = new THREE.SphereGeometry(0.5, 64, 64); // Red spheres with radius 0.5
            } else if ('color' in subSphere.material && (subSphere.material as THREE.MeshBasicMaterial).color.getHex() === 0x0000ff) {
              subSphere.geometry = new THREE.SphereGeometry(5, 64, 64); // Blue spheres with radius 1
            }
          } else {
            const subGeometry = new THREE.SphereGeometry(1, 64, 64); // Default to red spheres with radius 0.5
            const subMaterial = new THREE.MeshBasicMaterial({color: 0xff0000}); 
            subSphere = new THREE.Mesh(subGeometry, subMaterial);

            let collision = false;
            do {
              subSphere.position.x = sphere.position.x + (Math.random() - 0.5) * 200; // Increase the random range here
              subSphere.position.y = sphere.position.y + (Math.random() - 0.5) * 200; // Increase the random range here
              subSphere.position.z = sphere.position.z - 5; // Increase the z position difference here

              collision = scene.children.some((child) => {
                if (child === sphere || child === subSphere) return false;

                const distance = (child as THREE.Mesh).position.distanceTo(subSphere.position);
                return distance < (child.userData.radius as number) + subGeometry.parameters.radius;
              });
            } while (collision);

            subSphere.userData = { url: subLink, radius: subGeometry.parameters.radius };

            scene.add(subSphere);
            clickableObjects.push(subSphere);
            urlToSphere[subLink] = subSphere;
          }

          const points = [];
          points.push(new THREE.Vector3(sphere.position.x, sphere.position.y, sphere.position.z));
          points.push(
            new THREE.Vector3(subSphere.position.x, subSphere.position.y, subSphere.position.z)
          );

          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const meshLine = new MeshLine();
          meshLine.setGeometry(lineGeometry);

          let lineWidth = 0.2;

          if (
            'color' in sphere.material &&
            (sphere.material as THREE.MeshBasicMaterial).color.getHex() === 0x0000ff
          ) {
            lineWidth = 0.1;
          }

          const material = new MeshLineMaterial({
            color: new THREE.Color(0xffffff),
            lineWidth: lineWidth,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
          });

          const line = new THREE.Mesh(meshLine.geometry, material);
          scene.add(line);

          addedLinks.push(subLink);
        });
      });

      camera.position.z = 150;

      const animate = function () {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };

      animate();
    };

    getLinksData();

    return () => {
      if (mountRef.current) {
        while (mountRef.current.firstChild) {
          mountRef.current.removeChild(mountRef.current.firstChild);
        }
      }
      window.removeEventListener('click', onMouseClick);
    };
  }, []);

  return <div ref={mountRef} />;
};

export default Home;
