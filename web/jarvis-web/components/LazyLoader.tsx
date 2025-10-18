/**
 * Lazy Loading Component
 *
 * Features:
 * - Intersection Observer for images
 * - Code splitting for routes
 * - Prefetch on hover
 * - Progressive image loading
 * - Skeleton loading states
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';

// ===========================
// Lazy Image Component
// ===========================

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3C/svg%3E',
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading image
            const img = new Image();
            img.src = src;

            img.onload = () => {
              setImageSrc(src);
              setImageLoaded(true);
              onLoad?.();
            };

            img.onerror = () => {
              console.error(`Failed to load image: ${src}`);
              onError?.();
            };

            // Stop observing once loaded
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, threshold, rootMargin, onLoad, onError]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`lazy-image ${imageLoaded ? 'loaded' : 'loading'} ${className || ''}`}
      loading="lazy"
      {...props}
      style={{
        ...props.style,
        transition: 'opacity 0.3s ease-in-out',
        opacity: imageLoaded ? 1 : 0.5,
      }}
    />
  );
}

// ===========================
// Lazy Component Wrapper
// ===========================

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

export function LazyComponent({ children, fallback, delay = 0 }: LazyComponentProps) {
  const [shouldRender, setShouldRender] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShouldRender(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!shouldRender) {
    return fallback ? <>{fallback}</> : null;
  }

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

// ===========================
// Lazy Section (Intersection Observer)
// ===========================

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  onVisible?: () => void;
}

export function LazySection({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '100px',
  onVisible,
}: LazySectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
            onVisible?.();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(sectionRef.current);

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [threshold, rootMargin, isVisible, onVisible]);

  return (
    <div ref={sectionRef}>
      {isVisible ? children : fallback || <SkeletonLoader />}
    </div>
  );
}

// ===========================
// Prefetch Link
// ===========================

interface PrefetchLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  prefetchDelay?: number;
}

export function PrefetchLink({
  href,
  children,
  prefetchDelay = 100,
  ...props
}: PrefetchLinkProps) {
  const [isPrefetching, setIsPrefetching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (!isPrefetching) {
        // Prefetch the route
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
        setIsPrefetching(true);
      }
    }, prefetchDelay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <a
      href={href}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </a>
  );
}

// ===========================
// Progressive Image
// ===========================

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholderSrc?: string;
  alt: string;
}

export function ProgressiveImage({
  src,
  placeholderSrc,
  alt,
  className,
  ...props
}: ProgressiveImageProps) {
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.src = src;

    img.onload = () => {
      setCurrentSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setIsLoading(false);
    };
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`progressive-image ${isLoading ? 'loading' : 'loaded'} ${className || ''}`}
      {...props}
      style={{
        ...props.style,
        filter: isLoading ? 'blur(10px)' : 'none',
        transition: 'filter 0.3s ease-in-out',
      }}
    />
  );
}

// ===========================
// Skeleton Loader
// ===========================

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
}

export function SkeletonLoader({
  width = '100%',
  height = '20px',
  variant = 'rectangular',
  animation = 'pulse',
  className,
}: SkeletonLoaderProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return {
          borderRadius: '50%',
          width: height,
        };
      case 'text':
        return {
          borderRadius: '4px',
          height: '1em',
        };
      case 'rectangular':
      default:
        return {
          borderRadius: '4px',
        };
    }
  };

  const getAnimationStyles = () => {
    if (animation === 'none') return {};

    if (animation === 'wave') {
      return {
        background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-wave 1.5s ease-in-out infinite',
      };
    }

    // pulse
    return {
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    };
  };

  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes skeleton-wave {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
      <div
        className={`skeleton-loader ${className || ''}`}
        style={{
          width,
          height,
          backgroundColor: '#e0e0e0',
          ...getVariantStyles(),
          ...getAnimationStyles(),
        }}
      />
    </>
  );
}

// ===========================
// Lazy List (Virtualized)
// ===========================

interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
}

export function LazyList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 3,
  className,
}: LazyListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      className={`lazy-list ${className || ''}`}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: items.length * itemHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===========================
// Lazy Video
// ===========================

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  poster?: string;
  threshold?: number;
  rootMargin?: string;
}

export function LazyVideo({
  src,
  poster,
  threshold = 0.1,
  rootMargin = '100px',
  ...props
}: LazyVideoProps) {
  const [videoSrc, setVideoSrc] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVideoSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(videoRef.current);

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [src, threshold, rootMargin]);

  return <video ref={videoRef} src={videoSrc} poster={poster} {...props} />;
}

export default {
  LazyImage,
  LazyComponent,
  LazySection,
  PrefetchLink,
  ProgressiveImage,
  SkeletonLoader,
  LazyList,
  LazyVideo,
};
