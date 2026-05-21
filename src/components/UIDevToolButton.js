'use client'

import Link from 'next/link'
import { Code2, SlidersHorizontal } from 'lucide-react'

export default function UIDevToolButton() {
  return (
    <>
      <nav className="pathai-ui-devtool-stack" aria-label="PathAI UI devtools">
        <Link className="pathai-ui-devtool-button" href="/ui-devtool" aria-label="Open UI devtool">
          <SlidersHorizontal size={18} strokeWidth={2.5} />
          <span>UI</span>
        </Link>
        <Link className="pathai-ui-devtool-button pathai-ui-devtool-button-cs" href="/ui-devtool/cs-python" aria-label="Open CS-only Python devtool">
          <Code2 size={18} strokeWidth={2.5} />
          <span>CS</span>
        </Link>
      </nav>
      <style jsx>{`
        .pathai-ui-devtool-stack {
          position: fixed;
          right: 14px;
          top: 50%;
          z-index: 2147483000;
          transform: translateY(-50%);
          display: inline-flex;
          flex-direction: column;
          gap: 10px;
        }

        .pathai-ui-devtool-button {
          width: 48px;
          min-height: 74px;
          border: 1px solid rgba(125, 211, 252, 0.34);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(14, 24, 35, 0.95), rgba(5, 10, 18, 0.95));
          color: #bff2ff;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          font-family: var(--font-body), system-ui, sans-serif;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.1em;
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.46), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          transition: transform 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        }

        .pathai-ui-devtool-button-cs {
          border-color: rgba(14, 245, 194, 0.42);
          color: #c8ffee;
          background: linear-gradient(180deg, rgba(9, 35, 34, 0.96), rgba(4, 14, 20, 0.96));
        }

        .pathai-ui-devtool-button:hover {
          transform: translateX(-3px);
          color: #ffffff;
          border-color: rgba(14, 245, 194, 0.58);
        }

        @media (max-width: 720px) {
          .pathai-ui-devtool-stack {
            right: 10px;
            bottom: 92px;
            top: auto;
            transform: none;
            flex-direction: row;
          }

          .pathai-ui-devtool-button {
            width: 52px;
            min-height: 52px;
            border-radius: 50%;
          }

          .pathai-ui-devtool-button span {
            display: none;
          }
        }
      `}</style>
    </>
  )
}
