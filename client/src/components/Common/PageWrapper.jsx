import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export const PageWrapper = ({ children, className = '' }) => {
  const container = useRef();

  useGSAP(() => {
    gsap.from(container.current.children, {
      y: 15,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power3.out',
    });
  }, { scope: container });

  return (
    <div ref={container} className={`w-full ${className}`}>
      {children}
    </div>
  );
};
