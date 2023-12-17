import { useEffect, useRef, FC } from 'react';
import { getLinks } from '../actions/links';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const Home: FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return; 

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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

      const intersects = raycaster.intersectObjects(scene.children);

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

    links.forEach((link: any, index: number) => {
      const geometry = new THREE.SphereGeometry(1, 64, 64); 
      const material = new THREE.MeshBasicMaterial({color: 0x0000ff}); // Blue for base URL
      const sphere = new THREE.Mesh(geometry, material);

      sphere.position.x = index * 10; // Increase multiplier to spread more apart
      sphere.position.y = index * 10; // Increase multiplier to spread more apart

      sphere.userData = { url: link.url, radius: geometry.parameters.radius };

      scene.add(sphere);

      link.links.forEach((subLink: any) => {
        const subGeometry = new THREE.SphereGeometry(0.25, 32, 32); 
        const subMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00}); // Green for first level sub
        const subSphere = new THREE.Mesh(subGeometry, subMaterial);

        let collision = false;
        do {
          subSphere.position.x = sphere.position.x + (Math.random() - 0.5) * 20; // Increase multiplier to spread more apart
          subSphere.position.y = sphere.position.y + (Math.random() - 0.5) * 20; // Increase multiplier to spread more apart

          collision = scene.children.some(child => {
            if (child === sphere || child === subSphere) return false;

            const distance = (child as THREE.Mesh).position.distanceTo(subSphere.position);
            return distance < ((child.userData.radius as number) + subGeometry.parameters.radius);
          });
        } while (collision);

        subSphere.userData = { url: subLink, radius: subGeometry.parameters.radius };

        scene.add(subSphere);

        const material = new THREE.LineBasicMaterial({ color: 0xffffff });
        const points = [];
        points.push(new THREE.Vector3(sphere.position.x, sphere.position.y, 0));
        points.push(new THREE.Vector3(subSphere.position.x, subSphere.position.y, 0));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
      });
    });

      camera.position.z = 5;

      const animate = function () {
        requestAnimationFrame(animate);
        controls.update(); 
        renderer.render(scene, camera);
      };

      animate();
    }

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
}

export default Home;