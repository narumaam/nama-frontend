'use client';

/**
 * ProductTour — lightweight custom tour overlay.
 * No external packages. Pure CSS + JS tooltips with highlight ring.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TourStep } from '@/lib/tour';

interface ProductTourProps {
  steps: TourStep[];
  onDone: () => void;
  /** Short delay (ms) before the tour starts — gives the page time to render tour targets */
  startDelay?: number;
}

export default function ProductTour({ steps, onDone, startDelay = 600 }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const positionTooltip = useCallback(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(step.target);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const PAD = 12; // gap between target and tooltip
    const TOOLTIP_W = 300;
    const TOOLTIP_H = 140; // approximate

    // Highlight box
    const RING = 6;
    setHighlightStyle({
      position: 'fixed',
      top: rect.top - RING,
      left: rect.left - RING,
      width: rect.width + RING * 2,
      height: rect.height + RING * 2,
      borderRadius: 12,
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.45), 0 0 0 3px #6366f1',
      zIndex: 9998,
      pointerEvents: 'none',
      transition: 'all 0.25s ease',
    });

    // Scroll target into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Tooltip position
    let top = 0, left = 0;
    const arrowBase: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
    };

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + scrollY + PAD;
        left = rect.left + scrollX + rect.width / 2 - TOOLTIP_W / 2;
        setArrowStyle({
          ...arrowBase,
          top: -8,
          left: TOOLTIP_W / 2 - 8,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '8px solid white',
        });
        break;
      case 'top':
        top = rect.top + scrollY - TOOLTIP_H - PAD;
        left = rect.left + scrollX + rect.width / 2 - TOOLTIP_W / 2;
        setArrowStyle({
          ...arrowBase,
          bottom: -8,
          left: TOOLTIP_W / 2 - 8,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid white',
        });
        break;
      case 'right':
        top = rect.top + scrollY + rect.height / 2 - TOOLTIP_H / 2;
        left = rect.right + scrollX + PAD;
        setArrowStyle({
          ...arrowBase,
          top: TOOLTIP_H / 2 - 8,
          left: -8,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '8px solid white',
        });
        break;
      case 'left':
        top = rect.top + scrollY + rect.height / 2 - TOOLTIP_H / 2;
        left = rect.left + scrollX - TOOLTIP_W - PAD;
        setArrowStyle({
          ...arrowBase,
          top: TOOLTIP_H / 2 - 8,
          right: -8,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderLeft: '8px solid white',
        });
        break;
    }

    // Clamp to viewport
    const viewW = window.innerWidth;
    if (left < 8) left = 8;
    if (left + TOOLTIP_W > viewW - 8) left = viewW - TOOLTIP_W - 8;

    setTooltipStyle({
      position: 'absolute',
      top,
      left,
      width: TOOLTIP_W,
      zIndex: 9999,
    });
  }, [step]);

  // Start after delay
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  // Reposition when step changes or on resize/scroll
  useEffect(() => {
    if (!visible) return;
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    window.addEventListener('scroll', positionTooltip, true);
    const frameId = rafRef.current;
    return () => {
      window.removeEventListener('resize', positionTooltip);
      window.removeEventListener('scroll', positionTooltip, true);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [visible, currentStep, positionTooltip]);

  const handleNext = () => {
    if (isLast) {
      handleDone();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleDone = () => {
    setVisible(false);
    onDone();
  };

  if (!visible || !step) return null;

  // Check the target element exists; if not, skip to next step
  const targetEl = document.querySelector(step.target);
  if (!targetEl) {
    // Silently skip missing targets
    if (!isLast) {
      setCurrentStep((s) => s + 1);
    } else {
      handleDone();
    }
    return null;
  }

  return (
    <>
      {/* Semi-transparent backdrop (handled by highlight box-shadow) */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9997, cursor: 'default' }}
        onClick={handleDone}
        aria-label="Skip tour"
      />

      {/* Highlight ring around target */}
      <div style={highlightStyle} />

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow */}
        <div style={arrowStyle} />

        {/* Card */}
        <div
          style={{
            background: 'white',
            borderRadius: 16,
            padding: '18px 20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          {/* Step progress dots */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentStep ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === currentStep ? '#6366f1' : '#e2e8f0',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>

          {/* Title */}
          <h3
            style={{
              margin: '0 0 6px',
              fontSize: 15,
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.3,
            }}
          >
            {step.title}
          </h3>

          {/* Body */}
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 13,
              color: '#475569',
              lineHeight: 1.55,
            }}
          >
            {step.body}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handleDone}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: '#94a3b8',
                padding: '4px 0',
                fontWeight: 600,
              }}
            >
              Skip tour
            </button>
            <button
              onClick={handleNext}
              style={{
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {isLast ? 'Got it! 🎉' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
