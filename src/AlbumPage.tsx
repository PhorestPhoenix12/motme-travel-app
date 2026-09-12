import { useEffect, useMemo, useState } from 'react'
import type { StoredTrip } from './lib/persist'

interface Quest {
  id: string
  category: string
  title: string
  solved: boolean
  photoUrl: string | null
  note: string
  liked: boolean | null
}

type Sticker = () => JSX.Element

/* ═══════════════════════════════════════════════════════════
   CITY SVG STICKERS
═══════════════════════════════════════════════════════════ */

/* ── Paris ──────────────────────────────────────────────── */
function StickerEiffelTower() {
  return (
    <svg viewBox="0 0 40 62" width="40" height="62" aria-hidden="true">
      <path d="M20 4 L23 22 L27 38 L33 60 L7 60 L13 38 L17 22 Z" fill="#9C8B6E"/>
      <path d="M7 60 Q20 49 33 60" fill="none" stroke="#F5EDD8" strokeWidth="2.2"/>
      <line x1="16" y1="22" x2="24" y2="22" stroke="#F5EDD8" strokeWidth="2.8"/>
      <line x1="12" y1="38" x2="28" y2="38" stroke="#F5EDD8" strokeWidth="2.8"/>
      <line x1="20" y1="4" x2="20" y2="0" stroke="#9C8B6E" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
function StickerCroissant() {
  return (
    <svg viewBox="0 0 56 36" width="52" height="33" aria-hidden="true">
      <path d="M7 28 Q3 12 16 5 Q30 0 44 5 Q53 9 52 20 Q51 28 40 30 Q24 35 12 28 Z" fill="#D49A3C"/>
      <path d="M14 8 Q22 5 30 8" fill="none" stroke="#A87428" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M20 6 Q28 3 36 5" fill="none" stroke="#A87428" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 16 Q17 12 26 15" fill="none" stroke="#A87428" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 28 Q9 20 14 28" fill="#B87B2C" opacity="0.6"/>
      <path d="M40 30 Q48 22 52 20" fill="none" stroke="#B87B2C" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
function StickerArcDeTriomphe() {
  return (
    <svg viewBox="0 0 52 46" width="50" height="44" aria-hidden="true">
      <path fillRule="evenodd" d="M2 44 L2 6 L50 6 L50 44 Z M18 44 L18 28 A8 10 0 0 1 34 28 L34 44 Z" fill="#C4A882"/>
      <line x1="2" y1="14" x2="50" y2="14" stroke="#B09060" strokeWidth="2"/>
      <line x1="2" y1="10" x2="50" y2="10" stroke="#B09060" strokeWidth="1.2"/>
      <rect x="6" y="16" width="10" height="6" fill="#B09060" opacity="0.4"/>
      <rect x="36" y="16" width="10" height="6" fill="#B09060" opacity="0.4"/>
    </svg>
  )
}
function StickerMacaron() {
  return (
    <svg viewBox="0 0 44 30" width="44" height="30" aria-hidden="true">
      <ellipse cx="22" cy="9" rx="18" ry="8" fill="#F4A7B9"/>
      <ellipse cx="22" cy="15" rx="20" ry="4" fill="#E8899A"/>
      <rect x="4" y="14" width="36" height="4" rx="2" fill="#FFF0F3"/>
      <ellipse cx="22" cy="17" rx="20" ry="4" fill="#E8899A"/>
      <ellipse cx="22" cy="23" rx="18" ry="8" fill="#F4A7B9"/>
    </svg>
  )
}
function StickerBaguette() {
  return (
    <svg viewBox="0 0 68 22" width="64" height="22" aria-hidden="true">
      <path d="M4 16 Q6 4 34 4 Q62 4 64 14 Q62 20 34 20 Q6 20 4 16 Z" fill="#D49A3C"/>
      {[14, 24, 34, 44, 54].map((x, i) => (
        <line key={i} x1={x - 4} y1="8" x2={x + 2} y2="16" stroke="#A87428" strokeWidth="1.8" strokeLinecap="round"/>
      ))}
      <path d="M4 16 Q6 4 16 4" fill="none" stroke="#B87B2C" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M52 4 Q62 4 64 14" fill="none" stroke="#B87B2C" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
function StickerFleurDeLis() {
  return (
    <svg viewBox="0 0 36 48" width="34" height="46" aria-hidden="true">
      <g fill="#C9A045">
        <path d="M18 4 Q22 12 22 20 Q26 22 28 18 Q24 14 18 4Z"/>
        <path d="M18 4 Q14 12 14 20 Q10 22 8 18 Q12 14 18 4Z"/>
        <ellipse cx="18" cy="24" rx="6" ry="8"/>
        <path d="M8 18 Q2 22 4 28 Q8 28 12 24"/>
        <path d="M28 18 Q34 22 32 28 Q28 28 24 24"/>
        <path d="M12 30 Q18 38 24 30 Q22 36 22 40 L24 44 L18 42 L12 44 L14 40 Q14 36 12 30Z"/>
      </g>
    </svg>
  )
}

/* ── London ─────────────────────────────────────────────── */
function StickerBigBen() {
  return (
    <svg viewBox="0 0 32 66" width="30" height="64" aria-hidden="true">
      <path d="M4 20 L16 2 L28 20" fill="#8B7355"/>
      <rect x="2" y="18" width="28" height="16" fill="#9C8B6E" rx="1"/>
      <rect x="5" y="34" width="22" height="28" fill="#8B7355" rx="1"/>
      <circle cx="16" cy="27" r="9" fill="#F5EDD8"/>
      <circle cx="16" cy="27" r="8.5" fill="none" stroke="#8B7355" strokeWidth="0.8"/>
      <line x1="16" y1="27" x2="16" y2="20.5" stroke="#3D2B1F" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="16" y1="27" x2="21" y2="27" stroke="#3D2B1F" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M9 40 Q9 46 12 46 Q15 46 15 40" fill="none" stroke="#F5EDD8" strokeWidth="1.2"/>
      <path d="M17 40 Q17 46 20 46 Q23 46 23 40" fill="none" stroke="#F5EDD8" strokeWidth="1.2"/>
    </svg>
  )
}
function StickerRedBus() {
  return (
    <svg viewBox="0 0 72 46" width="68" height="43" aria-hidden="true">
      <rect x="2" y="4" width="68" height="36" fill="#C62828" rx="3"/>
      {[8, 20, 32, 44, 56].map((x, i) => (
        <rect key={i} x={x} y="8" width="9" height="9" fill="#D4EEF9" rx="1.5"/>
      ))}
      <rect x="2" y="4" width="38" height="10" fill="#F5F5F5" rx="2"/>
      {[8, 22, 36].map((x, i) => (
        <rect key={i} x={x} y="22" width="11" height="10" fill="#D4EEF9" rx="1.5"/>
      ))}
      <rect x="52" y="20" width="12" height="20" fill="#B01E1E" rx="1"/>
      <rect x="2" y="38" width="68" height="4" fill="#B01E1E" rx="1"/>
      <circle cx="14" cy="42" r="7" fill="#3D2B1F"/>
      <circle cx="14" cy="42" r="4" fill="#6B5335"/>
      <circle cx="56" cy="42" r="7" fill="#3D2B1F"/>
      <circle cx="56" cy="42" r="4" fill="#6B5335"/>
    </svg>
  )
}
function StickerTowerBridge() {
  return (
    <svg viewBox="0 0 72 50" width="68" height="47" aria-hidden="true">
      <rect x="2" y="28" width="68" height="5" fill="#9C8B6E"/>
      <rect x="8" y="10" width="14" height="28" fill="#8B7355" rx="1"/>
      <path d="M8 10 L15 2 L22 10" fill="#8B7355"/>
      <rect x="11" y="4" width="8" height="4" fill="#9C8B6E"/>
      <rect x="50" y="10" width="14" height="28" fill="#8B7355" rx="1"/>
      <path d="M50 10 L57 2 L64 10" fill="#8B7355"/>
      <rect x="53" y="4" width="8" height="4" fill="#9C8B6E"/>
      <path d="M15 10 Q36 22 57 10" fill="none" stroke="#6B5335" strokeWidth="2"/>
      {[20, 26, 32, 40, 46, 52].map((x, i) => {
        const cy = 10 + 12 * Math.sin((x - 15) / 42 * Math.PI)
        return <line key={i} x1={x} y1={cy} x2={x} y2="28" stroke="#6B5335" strokeWidth="1"/>
      })}
      <rect x="11" y="14" width="6" height="5" fill="#D4EEF9" rx="1"/>
      <rect x="53" y="14" width="6" height="5" fill="#D4EEF9" rx="1"/>
    </svg>
  )
}
function StickerPhoneBox() {
  return (
    <svg viewBox="0 0 34 60" width="32" height="58" aria-hidden="true">
      <path d="M5 12 Q17 2 29 12" fill="#C62828"/>
      <path d="M8 12 Q17 6 26 12" fill="#E53935"/>
      <rect x="3" y="10" width="28" height="46" fill="#C62828" rx="1"/>
      <rect x="7" y="16" width="20" height="28" fill="#D4EEF9" rx="1"/>
      <line x1="7" y1="24" x2="27" y2="24" stroke="#9C1B1B" strokeWidth="1"/>
      <line x1="7" y1="32" x2="27" y2="32" stroke="#9C1B1B" strokeWidth="1"/>
      <line x1="7" y1="40" x2="27" y2="40" stroke="#9C1B1B" strokeWidth="1"/>
      <line x1="17" y1="16" x2="17" y2="44" stroke="#9C1B1B" strokeWidth="1"/>
      <rect x="1" y="54" width="32" height="4" fill="#9C1B1B" rx="1"/>
      <rect x="6" y="12" width="22" height="5" fill="#9C1B1B"/>
      <line x1="8" y1="14" x2="26" y2="14" stroke="#F5EDD8" strokeWidth="1.5"/>
    </svg>
  )
}
function StickerCrown() {
  return (
    <svg viewBox="0 0 48 36" width="46" height="34" aria-hidden="true">
      <rect x="4" y="18" width="40" height="14" fill="#C9A045" rx="2"/>
      <path d="M4 18 L4 4 L14 14 L24 2 L34 14 L44 4 L44 18 Z" fill="#C9A045"/>
      <circle cx="14" cy="14" r="3.5" fill="#C62828"/>
      <circle cx="24" cy="10" r="4" fill="#1565C0"/>
      <circle cx="34" cy="14" r="3.5" fill="#2E7D32"/>
      <circle cx="14" cy="24" r="2.5" fill="#F5EDD8"/>
      <circle cx="24" cy="24" r="2.5" fill="#F5EDD8"/>
      <circle cx="34" cy="24" r="2.5" fill="#F5EDD8"/>
    </svg>
  )
}
function StickerTeaCup() {
  return (
    <svg viewBox="0 0 48 42" width="46" height="40" aria-hidden="true">
      <ellipse cx="22" cy="36" rx="20" ry="5" fill="#F5EDD8" stroke="#C4A882" strokeWidth="1.5"/>
      <path d="M8 18 Q6 32 12 34 Q22 38 32 34 Q38 32 36 18 Z" fill="#F5EDD8" stroke="#C4A882" strokeWidth="1.5"/>
      <path d="M10 20 Q10 28 14 30 Q22 33 30 30 Q34 28 34 20 Z" fill="#C4882A" opacity="0.85"/>
      <ellipse cx="22" cy="18" rx="14" ry="4" fill="#F5EDD8" stroke="#C4A882" strokeWidth="1.5"/>
      <path d="M36 20 Q44 22 44 26 Q44 30 36 30" fill="none" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M16 14 Q14 8 17 4" fill="none" stroke="#D4CBAA" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M22 12 Q20 6 23 2" fill="none" stroke="#D4CBAA" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M28 14 Q26 8 29 4" fill="none" stroke="#D4CBAA" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

/* ── Venice ─────────────────────────────────────────────── */
function StickerGondola() {
  return (
    <svg viewBox="0 0 78 38" width="74" height="36" aria-hidden="true">
      <path d="M6 26 Q4 20 8 16 L60 13 Q72 13 74 20 Q74 26 66 28 L14 30 Z" fill="#1A1A2E"/>
      <path d="M60 13 Q72 10 72 6 Q68 2 64 5 Q66 9 60 13Z" fill="#1A1A2E"/>
      <path d="M72 6 Q74 3 70 2 Q66 1 64 5" fill="none" stroke="#C9A045" strokeWidth="1.5"/>
      <line x1="18" y1="30" x2="22" y2="0" stroke="#6B4C2A" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M30 15 Q40 11 52 13 Q52 18 40 19 Q30 20 30 15Z" fill="#C62828" opacity="0.9"/>
      <path d="M6 30 Q40 34 74 28" fill="none" stroke="#5B9EC9" strokeWidth="1.5" opacity="0.6"/>
    </svg>
  )
}
function StickerCarnivalMask() {
  return (
    <svg viewBox="0 0 60 46" width="58" height="44" aria-hidden="true">
      <path d="M8 22 Q8 6 30 5 Q52 6 52 22 Q52 36 38 40 Q22 44 12 36 Z" fill="#E8C87A"/>
      <path fillRule="evenodd" d="M14 20 Q14 14 22 14 Q30 14 30 20 Q30 26 22 26 Q14 26 14 20 Z M16 20 Q16 16 22 16 Q28 16 28 20 Q28 24 22 24 Q16 24 16 20 Z" fill="#1A1A1A"/>
      <path fillRule="evenodd" d="M30 20 Q30 14 38 14 Q46 14 46 20 Q46 26 38 26 Q30 26 30 20 Z M32 20 Q32 16 38 16 Q44 16 44 20 Q44 24 38 24 Q32 24 32 20 Z" fill="#1A1A1A"/>
      <path d="M8 22 Q4 18 6 12 Q10 8 14 14" fill="none" stroke="#C9A045" strokeWidth="1.8"/>
      <path d="M52 22 Q56 18 54 12 Q50 8 46 14" fill="none" stroke="#C9A045" strokeWidth="1.8"/>
      <path d="M50 10 Q56 2 60 6 Q58 12 52 14" fill="#C62828" opacity="0.85"/>
      <path d="M50 10 Q58 6 60 11 Q56 16 52 14" fill="#9C27B0" opacity="0.7"/>
    </svg>
  )
}
function StickerRialtoBridge() {
  return (
    <svg viewBox="0 0 68 44" width="66" height="42" aria-hidden="true">
      <path fillRule="evenodd" d="M2 42 L2 28 Q34 10 66 28 L66 42 Z M20 42 L20 32 A14 14 0 0 1 48 32 L48 42 Z" fill="#C4A882"/>
      <rect x="2" y="34" width="18" height="3" fill="#D4B892" rx="0.5"/>
      <rect x="2" y="38" width="18" height="3" fill="#D4B892" rx="0.5"/>
      <rect x="48" y="34" width="18" height="3" fill="#D4B892" rx="0.5"/>
      <rect x="48" y="38" width="18" height="3" fill="#D4B892" rx="0.5"/>
      <path d="M22 30 Q26 26 30 30 M32 30 Q36 26 40 30 M42 30 Q46 26 50 30" fill="none" stroke="#B09060" strokeWidth="1.5"/>
    </svg>
  )
}
function StickerWineglass() {
  return (
    <svg viewBox="0 0 30 52" width="28" height="50" aria-hidden="true">
      <path d="M6 4 Q4 20 15 28 Q26 20 24 4 Z" fill="#C62828" opacity="0.88"/>
      <ellipse cx="15" cy="4" rx="9" ry="3" fill="none" stroke="#9C8B6E" strokeWidth="1.5"/>
      <path d="M8 6 Q8 16 12 22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="15" y1="28" x2="15" y2="42" stroke="#9C8B6E" strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="15" cy="44" rx="10" ry="3" fill="#9C8B6E"/>
    </svg>
  )
}
function StickerCampanile() {
  return (
    <svg viewBox="0 0 30 64" width="28" height="62" aria-hidden="true">
      <path d="M15 2 L20 14 L10 14 Z" fill="#C4622D"/>
      <rect x="8" y="12" width="14" height="12" fill="#D4622D" rx="1"/>
      <path d="M9 24 Q9 18 15 18 Q21 18 21 24" fill="#B04020" opacity="0.5"/>
      <rect x="9" y="24" width="12" height="36" fill="#C4622D" rx="0.5"/>
      <line x1="9" y1="36" x2="21" y2="36" stroke="#B04020" strokeWidth="2"/>
      <line x1="9" y1="44" x2="21" y2="44" stroke="#B04020" strokeWidth="2"/>
      <rect x="6" y="58" width="18" height="4" fill="#B04020" rx="1"/>
    </svg>
  )
}

/* ── Istanbul ───────────────────────────────────────────── */
function StickerBlueMosque() {
  return (
    <svg viewBox="0 0 62 64" width="60" height="62" aria-hidden="true">
      <path d="M14 34 Q14 16 31 14 Q48 16 48 34 Z" fill="#2B5F8E"/>
      <path d="M20 38 Q20 30 31 28 Q42 30 42 38 Z" fill="#3A72A4"/>
      <rect x="4" y="22" width="6" height="36" fill="#2B5F8E" rx="1"/>
      <path d="M4 22 L7 14 L10 22" fill="#1A4D7A"/>
      <ellipse cx="7" cy="14" rx="2.5" ry="1.5" fill="#C9A045"/>
      <rect x="52" y="22" width="6" height="36" fill="#2B5F8E" rx="1"/>
      <path d="M52 22 L55 14 L58 22" fill="#1A4D7A"/>
      <ellipse cx="55" cy="14" rx="2.5" ry="1.5" fill="#C9A045"/>
      <path d="M27 14 Q25 9 28 6 Q32 5 34 8 Q31 7 29 10 Q30 14 27 14Z" fill="#C9A045"/>
      <rect x="14" y="34" width="34" height="20" fill="#3A72A4" rx="1"/>
      <path d="M18 52 Q18 46 22 46 Q26 46 26 52" fill="#2B5F8E"/>
      <path d="M27 52 Q27 46 31 46 Q35 46 35 52" fill="#2B5F8E"/>
      <path d="M36 52 Q36 46 40 46 Q44 46 44 52" fill="#2B5F8E"/>
    </svg>
  )
}
function StickerEvilEye() {
  return (
    <svg viewBox="0 0 44 52" width="40" height="48" aria-hidden="true">
      <path d="M20 4 Q20 0 24 0 Q28 0 28 4 Q28 7 24 7" fill="none" stroke="#9C8B6E" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="22" cy="30" r="18" fill="#1565C0"/>
      <circle cx="22" cy="30" r="13" fill="#F5F5F5"/>
      <circle cx="22" cy="30" r="9" fill="#0D47A1"/>
      <circle cx="22" cy="30" r="5.5" fill="#0D0D0D"/>
      <circle cx="19" cy="27" r="2.5" fill="white" opacity="0.9"/>
    </svg>
  )
}
function StickerTulip() {
  return (
    <svg viewBox="0 0 34 54" width="32" height="52" aria-hidden="true">
      <path d="M17 38 Q7 28 8 16 Q9 5 17 9 Q14 20 17 38Z" fill="#E91E63" opacity="0.9"/>
      <path d="M17 38 Q27 28 26 16 Q25 5 17 9 Q20 20 17 38Z" fill="#C2185B"/>
      <line x1="17" y1="38" x2="17" y2="52" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M17 44 Q8 40 10 33" fill="none" stroke="#388E3C" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M17 42 Q26 38 24 31" fill="none" stroke="#388E3C" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
function StickerTurkishTea() {
  return (
    <svg viewBox="0 0 34 48" width="32" height="46" aria-hidden="true">
      <ellipse cx="17" cy="40" rx="15" ry="4" fill="#F5EDD8" stroke="#C4A882" strokeWidth="1.5"/>
      <path d="M7 14 Q5 24 9 30 Q13 34 17 34 Q21 34 25 30 Q29 24 27 14 Z" fill="#E8A030" opacity="0.9"/>
      <ellipse cx="17" cy="14" rx="10" ry="3.5" fill="#C9A045" opacity="0.8"/>
      <path d="M9 16 Q8 24 11 30" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M27 18 Q32 20 32 26 Q32 30 27 30" fill="none" stroke="#C4A882" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
function StickerBalava() {
  return (
    <svg viewBox="0 0 44 36" width="42" height="34" aria-hidden="true">
      <path d="M22 4 L40 18 L22 32 L4 18 Z" fill="#C9A045"/>
      <line x1="10" y1="12" x2="34" y2="12" stroke="#A87428" strokeWidth="1.2" opacity="0.6"/>
      <line x1="8" y1="16" x2="36" y2="16" stroke="#A87428" strokeWidth="1.5"/>
      <line x1="10" y1="20" x2="34" y2="20" stroke="#A87428" strokeWidth="1.2" opacity="0.6"/>
      <line x1="8" y1="24" x2="36" y2="24" stroke="#A87428" strokeWidth="1.5"/>
      <path d="M18 14 L22 10 L26 14 Q26 20 22 22 Q18 20 18 14Z" fill="#7CB342" opacity="0.8"/>
    </svg>
  )
}
function StickerGrandBazaarArch() {
  return (
    <svg viewBox="0 0 54 48" width="52" height="46" aria-hidden="true">
      <path fillRule="evenodd" d="M2 46 L2 16 Q27 4 52 16 L52 46 Z M18 46 L18 28 A9 12 0 0 1 36 28 L36 46 Z" fill="#C4A882"/>
      <path d="M2 22 Q27 8 52 22" fill="none" stroke="#2B5F8E" strokeWidth="2.5" strokeDasharray="3,2"/>
      <path d="M2 28 Q27 14 52 28" fill="none" stroke="#C9A045" strokeWidth="1.5" strokeDasharray="2,2"/>
      <path d="M22 6 Q21 2 24 1 Q27 1 27 4 Q25 3 24 5 Q25 7 22 6Z" fill="#C9A045"/>
      <rect x="20" y="36" width="14" height="10" fill="#8B6914" opacity="0.7"/>
      <path d="M20 36 Q27 32 34 36" fill="#6B4C14" opacity="0.8"/>
    </svg>
  )
}

/* ── Rome ───────────────────────────────────────────────── */
function StickerColosseum() {
  return (
    <svg viewBox="0 0 68 48" width="66" height="46" aria-hidden="true">
      <path fillRule="evenodd" d="M2 46 Q2 10 34 8 Q66 10 66 46 Z M8 46 Q8 16 34 14 Q60 16 60 46 Z" fill="#C4A882"/>
      {[10, 20, 30, 40, 50].map((x, i) => (
        <path key={i} d={`M${x} 46 Q${x + 5} 38 ${x + 10} 46`} fill="none" stroke="#B09060" strokeWidth="1.5"/>
      ))}
      {[12, 22, 32, 42].map((x, i) => (
        <path key={i} d={`M${x} 30 Q${x + 5} 22 ${x + 10} 30`} fill="none" stroke="#B09060" strokeWidth="1.2"/>
      ))}
      <path d="M8 30 Q34 26 60 30" fill="none" stroke="#B09060" strokeWidth="1.8"/>
      <rect x="54" y="8" width="14" height="18" fill="#EAE3D2" opacity="0.9"/>
      <path d="M54 14 Q58 8 62 12 L66 10 Q66 26 60 26" fill="#C4A882"/>
    </svg>
  )
}
function StickerPizzaSlice() {
  return (
    <svg viewBox="0 0 46 52" width="44" height="50" aria-hidden="true">
      <path d="M4 4 Q23 0 42 4 L42 4 Q46 8 44 12 Q38 16 23 16 Q8 16 2 12 Q0 8 4 4Z" fill="#D49A3C"/>
      <path d="M2 12 Q23 16 44 12 L32 52 L23 52 L14 52 Z" fill="#C4622D"/>
      <path d="M10 20 Q23 22 36 20 L32 52 L14 52 Z" fill="#B03520"/>
      <ellipse cx="18" cy="30" rx="5" ry="4" fill="#F5D27A"/>
      <ellipse cx="28" cy="28" rx="5" ry="4" fill="#F5D27A"/>
      <ellipse cx="23" cy="40" rx="4" ry="3.5" fill="#F5D27A"/>
      <circle cx="22" cy="24" r="2" fill="#388E3C"/>
      <circle cx="30" cy="36" r="2" fill="#1A1A1A" opacity="0.7"/>
    </svg>
  )
}
function StickerVespa() {
  return (
    <svg viewBox="0 0 64 46" width="62" height="44" aria-hidden="true">
      <circle cx="14" cy="36" r="9" fill="none" stroke="#3D2B1F" strokeWidth="3.5"/>
      <circle cx="14" cy="36" r="5" fill="none" stroke="#3D2B1F" strokeWidth="2"/>
      <circle cx="52" cy="38" r="8" fill="none" stroke="#3D2B1F" strokeWidth="3.5"/>
      <circle cx="52" cy="38" r="4.5" fill="none" stroke="#3D2B1F" strokeWidth="2"/>
      <path d="M14 28 Q14 14 28 12 Q40 10 48 16 Q54 20 52 30 L14 28 Z" fill="#C9A045"/>
      <line x1="48" y1="16" x2="52" y2="30" stroke="#9C8B6E" strokeWidth="3" strokeLinecap="round"/>
      <path d="M14 28 Q10 22 10 18 Q12 14 20 14 Q28 14 28 20" fill="#C9A045"/>
      <path d="M14 22 Q20 18 28 20" fill="#B08830" opacity="0.8"/>
      <path d="M48 14 Q46 8 50 6 Q54 6 56 10" fill="none" stroke="#9C8B6E" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M44 12 Q48 6 50 8 Q48 12 44 14 Z" fill="#D4EEF9" opacity="0.8"/>
    </svg>
  )
}
function StickerGelatoCone() {
  return (
    <svg viewBox="0 0 38 58" width="36" height="56" aria-hidden="true">
      <path d="M8 28 L30 28 L19 56 Z" fill="#D49A3C"/>
      <line x1="13" y1="28" x2="16" y2="48" stroke="#B87B2C" strokeWidth="1"/>
      <line x1="19" y1="28" x2="19" y2="52" stroke="#B87B2C" strokeWidth="1"/>
      <line x1="25" y1="28" x2="22" y2="48" stroke="#B87B2C" strokeWidth="1"/>
      <path d="M5 22 Q5 10 19 9 Q33 10 33 22 Q33 30 19 30 Q5 30 5 22Z" fill="#6D3B1E"/>
      <path d="M8 16 Q8 4 19 3 Q30 4 30 16 Q30 22 19 22 Q8 22 8 16Z" fill="#F4A0A0"/>
      <circle cx="17" cy="10" r="1.5" fill="#C62828" opacity="0.7"/>
      <circle cx="22" cy="8" r="1.5" fill="#C62828" opacity="0.7"/>
    </svg>
  )
}
function StickerRomanColumn() {
  return (
    <svg viewBox="0 0 30 64" width="28" height="62" aria-hidden="true">
      <path d="M4 12 Q4 6 15 5 Q26 6 26 12 L28 14 L2 14 Z" fill="#E8DCC8"/>
      <rect x="2" y="6" width="26" height="4" fill="#D4C8A8" rx="0.5"/>
      <path d="M7 14 Q5 34 6 54 L24 54 Q25 34 23 14 Z" fill="#E8DCC8"/>
      <line x1="11" y1="14" x2="11" y2="54" stroke="#D4C8A8" strokeWidth="1"/>
      <line x1="15" y1="14" x2="15" y2="54" stroke="#D4C8A8" strokeWidth="1.2"/>
      <line x1="19" y1="14" x2="19" y2="54" stroke="#D4C8A8" strokeWidth="1"/>
      <rect x="4" y="54" width="22" height="4" fill="#D4C8A8" rx="0.5"/>
      <rect x="2" y="58" width="26" height="4" fill="#C4B898" rx="0.5"/>
    </svg>
  )
}

/* ── Vienna ─────────────────────────────────────────────── */
function StickerSchoenbrunn() {
  return (
    <svg viewBox="0 0 72 44" width="70" height="42" aria-hidden="true">
      <rect x="4" y="16" width="64" height="26" fill="#F5C842" rx="1"/>
      <rect x="26" y="8" width="20" height="34" fill="#E8B838"/>
      <rect x="4" y="12" width="64" height="4" fill="#D4A828" rx="1"/>
      <rect x="26" y="6" width="20" height="4" fill="#D4A828"/>
      {[8, 18, 32, 44, 54].map((x, i) => (
        <rect key={i} x={x} y="20" width="8" height="10" fill="#D4EEF9" rx="1"/>
      ))}
      {[8, 18, 32, 44, 54].map((x, i) => (
        <rect key={i} x={x} y="34" width="8" height="7" fill="#D4EEF9" rx="1"/>
      ))}
      <path d="M26 8 L36 2 L46 8" fill="#D4A828"/>
      <path d="M32 40 Q32 34 36 33 Q40 34 40 40" fill="#8B6914" opacity="0.8"/>
    </svg>
  )
}
function StickerSachertorte() {
  return (
    <svg viewBox="0 0 46 44" width="44" height="42" aria-hidden="true">
      <path d="M4 4 L42 4 L36 42 L10 42 Z" fill="#F5EDD8"/>
      <rect x="4" y="4" width="38" height="8" fill="#3D1A00" rx="1"/>
      <rect x="4" y="8" width="38" height="5" fill="#4A2200"/>
      <rect x="6" y="16" width="34" height="5" fill="#C62828"/>
      <rect x="6" y="21" width="34" height="6" fill="#C4882A" opacity="0.9"/>
      <rect x="7" y="27" width="33" height="6" fill="#D49A3C" opacity="0.8"/>
      <rect x="8" y="33" width="30" height="6" fill="#C4882A" opacity="0.9"/>
      <path d="M12 12 Q14 16 12 18 M20 12 Q22 17 20 20 M28 12 Q30 17 28 18 M36 12 Q38 16 36 18" fill="none" stroke="#3D1A00" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
function StickerViennaCoffee() {
  return (
    <svg viewBox="0 0 46 44" width="44" height="42" aria-hidden="true">
      <ellipse cx="23" cy="38" rx="20" ry="5" fill="#F5EDD8" stroke="#C4A882" strokeWidth="1.5"/>
      <path d="M10 18 Q8 32 14 36 Q23 40 32 36 Q38 32 36 18 Z" fill="#F5EDD8" stroke="#C4A882" strokeWidth="1.5"/>
      <path d="M36 22 Q44 24 44 28 Q44 32 36 32" fill="none" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M12 20 Q12 28 16 32 Q23 35 30 32 Q34 28 34 20 Z" fill="#3D1A00"/>
      <path d="M10 18 Q16 12 23 14 Q30 12 36 18" fill="#F5F5F5" stroke="#E0D8C0" strokeWidth="1"/>
      <path d="M12 16 Q18 10 23 12 Q28 10 34 16" fill="#F5F5F5"/>
      <path d="M18 12 Q16 6 19 2" fill="none" stroke="#D4CBAA" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M28 12 Q26 6 29 2" fill="none" stroke="#D4CBAA" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}
function StickerRiesenrad() {
  return (
    <svg viewBox="0 0 52 60" width="50" height="58" aria-hidden="true">
      <circle cx="26" cy="26" r="22" fill="none" stroke="#8B7355" strokeWidth="2.5"/>
      {[0, 45, 90, 135].map((angle, i) => {
        const r = angle * Math.PI / 180
        return <line key={i} x1={26 + 22 * Math.cos(r)} y1={26 + 22 * Math.sin(r)} x2={26 - 22 * Math.cos(r)} y2={26 - 22 * Math.sin(r)} stroke="#8B7355" strokeWidth="1.5"/>
      })}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const r = angle * Math.PI / 180
        return <rect key={i} x={26 + 20 * Math.cos(r) - 3} y={26 + 20 * Math.sin(r) - 4} width="6" height="8" fill="#C4A882" stroke="#8B7355" strokeWidth="1" rx="1"/>
      })}
      <circle cx="26" cy="26" r="4" fill="#9C8B6E"/>
      <line x1="8" y1="48" x2="26" y2="48" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="44" y1="48" x2="26" y2="48" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="8" y1="48" x2="14" y2="58" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="44" y1="48" x2="38" y2="58" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
function StickerOperaMask() {
  return (
    <svg viewBox="0 0 52 38" width="50" height="36" aria-hidden="true">
      <line x1="44" y1="36" x2="36" y2="24" stroke="#8B6914" strokeWidth="3" strokeLinecap="round"/>
      <path d="M6 20 Q6 6 26 5 Q46 6 46 20 Q46 32 34 34 Q20 36 12 30 Z" fill="#F5EDD8" stroke="#C4A882" strokeWidth="1.5"/>
      <path fillRule="evenodd" d="M12 18 Q12 12 20 12 Q28 12 28 18 Q28 24 20 24 Q12 24 12 18 Z M14 18 Q14 14 20 14 Q26 14 26 18 Q26 22 20 22 Q14 22 14 18 Z" fill="#2C1C10"/>
      <path fillRule="evenodd" d="M28 18 Q28 14 34 14 Q40 14 40 18 Q40 22 34 22 Q28 22 28 18 Z M30 18 Q30 15 34 15 Q38 15 38 18 Q38 21 34 21 Q30 21 30 18 Z" fill="#2C1C10"/>
      <path d="M20 26 Q26 30 32 26" fill="none" stroke="#8B6914" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 6 Q16 0 20 2 Q18 6 16 6" fill="#C62828" opacity="0.7"/>
      <path d="M26 5 Q26 0 30 2 Q28 6 26 5" fill="#9C27B0" opacity="0.7"/>
    </svg>
  )
}

/* ── Budapest ───────────────────────────────────────────── */
function StickerChainBridge() {
  return (
    <svg viewBox="0 0 74 48" width="70" height="46" aria-hidden="true">
      <rect x="4" y="28" width="66" height="5" fill="#C4A882"/>
      <rect x="8" y="8" width="12" height="28" fill="#9C8B6E" rx="1"/>
      <path d="M8 8 L14 2 L20 8" fill="#8B7355"/>
      <rect x="54" y="8" width="12" height="28" fill="#9C8B6E" rx="1"/>
      <path d="M54 8 L60 2 L66 8" fill="#8B7355"/>
      <path d="M14 8 Q37 22 60 8" fill="none" stroke="#6B5335" strokeWidth="2.5"/>
      {[20, 26, 30, 34, 38, 42, 48, 54].map((x, i) => {
        const y = 28 - 8 * Math.sin((x - 14) / 46 * Math.PI) + 8
        return <line key={i} x1={x} y1={y} x2={x} y2="28" stroke="#6B5335" strokeWidth="1"/>
      })}
      <circle cx="8" cy="28" r="4" fill="#C4A882"/>
      <circle cx="66" cy="28" r="4" fill="#C4A882"/>
      <path d="M4 36 Q37 40 70 36" fill="none" stroke="#5B9EC9" strokeWidth="1.5" opacity="0.6"/>
    </svg>
  )
}
function StickerParliamentBudapest() {
  return (
    <svg viewBox="0 0 72 50" width="70" height="48" aria-hidden="true">
      <rect x="6" y="26" width="60" height="22" fill="#E8DCC8" rx="1"/>
      <path d="M28 26 Q28 6 36 4 Q44 6 44 26 Z" fill="#C62828"/>
      <rect x="33" y="4" width="6" height="6" fill="#C9A045" rx="1"/>
      <path d="M34 4 L36 0 L38 4" fill="#C9A045"/>
      <rect x="6" y="16" width="10" height="32" fill="#D4C8A8" rx="1"/>
      <path d="M6 16 L11 10 L16 16" fill="#C4B898"/>
      <rect x="56" y="16" width="10" height="32" fill="#D4C8A8" rx="1"/>
      <path d="M56 16 L61 10 L66 16" fill="#C4B898"/>
      {[10, 18, 26, 36, 46, 54].map((x, i) => (
        <path key={i} d={`M${x} 46 Q${x + 4} 40 ${x + 8} 46`} fill="none" stroke="#C4B898" strokeWidth="1.2"/>
      ))}
      <path d="M6 48 Q36 52 66 48" fill="none" stroke="#5B9EC9" strokeWidth="2" opacity="0.55"/>
    </svg>
  )
}
function StickerPaprika() {
  return (
    <svg viewBox="0 0 28 54" width="26" height="52" aria-hidden="true">
      <line x1="14" y1="2" x2="14" y2="8" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M8 8 Q14 4 20 8 Q18 12 14 12 Q10 12 8 8Z" fill="#388E3C"/>
      <path d="M8 8 Q4 16 5 30 Q6 44 14 52 Q22 44 23 30 Q24 16 20 8 Z" fill="#C62828"/>
      <path d="M8 10 Q7 20 8 32" fill="none" stroke="rgba(255,180,180,0.5)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}
function StickerRubiksCube() {
  return (
    <svg viewBox="0 0 46 50" width="44" height="48" aria-hidden="true">
      <path d="M23 4 L42 14 L23 24 L4 14 Z" fill="#F5D27A"/>
      <line x1="16" y1="10" x2="30" y2="18" stroke="#C9A045" strokeWidth="1"/>
      <line x1="10" y1="14" x2="36" y2="14" stroke="#C9A045" strokeWidth="1"/>
      <path d="M4 14 L23 24 L23 44 L4 34 Z" fill="#C62828"/>
      <line x1="4" y1="24" x2="23" y2="34" stroke="#9C1B1B" strokeWidth="1"/>
      <line x1="11" y1="17" x2="11" y2="37" stroke="#9C1B1B" strokeWidth="1"/>
      <path d="M23 24 L42 14 L42 34 L23 44 Z" fill="#1565C0"/>
      <line x1="23" y1="34" x2="42" y2="24" stroke="#0D47A1" strokeWidth="1"/>
      <line x1="35" y1="17" x2="35" y2="37" stroke="#0D47A1" strokeWidth="1"/>
      <rect x="27" y="26" width="5" height="5" fill="#2E7D32" rx="0.5"/>
      <rect x="33" y="22" width="5" height="5" fill="#F5D27A" rx="0.5"/>
      <rect x="6" y="26" width="5" height="5" fill="#F5D27A" rx="0.5"/>
      <rect x="13" y="30" width="5" height="5" fill="#2E7D32" rx="0.5"/>
    </svg>
  )
}

/* ── Athens ─────────────────────────────────────────────── */
function StickerParthenon() {
  return (
    <svg viewBox="0 0 66 46" width="64" height="44" aria-hidden="true">
      <rect x="2" y="40" width="62" height="3" fill="#E8DCC8" rx="0.5"/>
      <rect x="4" y="37" width="58" height="3" fill="#D4C8A8" rx="0.5"/>
      <rect x="6" y="34" width="54" height="3" fill="#E8DCC8" rx="0.5"/>
      {[10, 19, 28, 37, 46, 55].map((x, i) => (
        <g key={i}>
          <rect x={x - 2} y="14" width="8" height="3" fill="#D4C8A8" rx="0.5"/>
          <rect x={x - 1} y="16" width="6" height="18" fill="#E8DCC8"/>
          <line x1={x + 1.5} y1="16" x2={x + 1.5} y2="34" stroke="#D4C8A8" strokeWidth="0.8"/>
          <line x1={x + 4} y1="16" x2={x + 4} y2="34" stroke="#D4C8A8" strokeWidth="0.8"/>
        </g>
      ))}
      <rect x="8" y="10" width="50" height="4" fill="#D4C8A8" rx="0.5"/>
      <path d="M8 10 L33 2 L58 10" fill="#C4B898" stroke="#B0A080" strokeWidth="1"/>
    </svg>
  )
}
function StickerAmphora() {
  return (
    <svg viewBox="0 0 34 56" width="32" height="54" aria-hidden="true">
      <path d="M12 8 Q17 4 22 8 L22 14 Q17 12 12 14 Z" fill="#C4622D"/>
      <ellipse cx="17" cy="8" rx="6" ry="3" fill="#D4722D"/>
      <path d="M12 14 Q4 16 4 22 Q4 26 12 26" fill="none" stroke="#C4622D" strokeWidth="3" strokeLinecap="round"/>
      <path d="M22 14 Q30 16 30 22 Q30 26 22 26" fill="none" stroke="#C4622D" strokeWidth="3" strokeLinecap="round"/>
      <path d="M12 14 Q6 22 8 36 Q10 48 17 50 Q24 48 26 36 Q28 22 22 14 Z" fill="#C4622D"/>
      <path d="M10 20 Q17 18 24 20" fill="none" stroke="#8B3A1A" strokeWidth="2"/>
      <path d="M9 26 Q17 24 25 26" fill="none" stroke="#8B3A1A" strokeWidth="1.5"/>
      <path d="M14 50 Q17 56 20 50" fill="#C4622D"/>
    </svg>
  )
}
function StickerOliveBranch() {
  return (
    <svg viewBox="0 0 54 38" width="52" height="36" aria-hidden="true">
      <path d="M4 34 Q20 22 50 6" fill="none" stroke="#558B2F" strokeWidth="2.5" strokeLinecap="round"/>
      {[[10, 30, -30], [20, 24, -20], [30, 18, -15], [40, 12, -10]].map(([cx, cy, rot], i) => (
        <g key={i} transform={`rotate(${rot}, ${cx}, ${cy})`}>
          <ellipse cx={cx} cy={cy} rx="7" ry="3.5" fill="#7CB342" opacity={0.85 - i * 0.05}/>
        </g>
      ))}
      <ellipse cx="26" cy="20" rx="3.5" ry="5.5" fill="#827717" opacity="0.9"/>
      <ellipse cx="38" cy="14" rx="3" ry="4.5" fill="#33691E" opacity="0.85"/>
      <ellipse cx="14" cy="28" rx="3" ry="4.5" fill="#827717" opacity="0.8"/>
    </svg>
  )
}

/* ── Prague ─────────────────────────────────────────────── */
function StickerAstronomicalClock() {
  return (
    <svg viewBox="0 0 52 60" width="50" height="58" aria-hidden="true">
      <path fillRule="evenodd" d="M2 58 L2 22 Q26 2 50 22 L50 58 Z M8 58 L8 22 Q26 8 44 22 L44 58 Z" fill="#8B7355"/>
      <circle cx="26" cy="32" r="18" fill="#0D1B4A"/>
      <circle cx="26" cy="32" r="18" fill="none" stroke="#C9A045" strokeWidth="2"/>
      <circle cx="26" cy="32" r="14" fill="none" stroke="#C9A045" strokeWidth="1.2"/>
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
        const r = angle * Math.PI / 180
        return <line key={i} x1={26 + 12 * Math.cos(r)} y1={32 + 12 * Math.sin(r)} x2={26 + 14 * Math.cos(r)} y2={32 + 14 * Math.sin(r)} stroke="#C9A045" strokeWidth="1.2"/>
      })}
      <circle cx="26" cy="32" r="7" fill="#C9A045" opacity="0.9"/>
      <circle cx="26" cy="32" r="4" fill="#E8B838"/>
      <line x1="26" y1="32" x2="26" y2="20" stroke="#F5EDD8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="26" y1="32" x2="34" y2="28" stroke="#C9A045" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function StickerPragueCastle() {
  return (
    <svg viewBox="0 0 72 44" width="70" height="42" aria-hidden="true">
      <path d="M0 44 Q36 28 72 44 Z" fill="#D4C8A8" opacity="0.5"/>
      <rect x="16" y="22" width="40" height="20" fill="#C4B898" rx="1"/>
      <rect x="22" y="8" width="8" height="16" fill="#8B7355" rx="0.5"/>
      <path d="M22 8 L26 2 L30 8" fill="#8B7355"/>
      <rect x="34" y="4" width="8" height="20" fill="#9C8B6E" rx="0.5"/>
      <path d="M34 4 L38 0 L42 4" fill="#9C8B6E"/>
      <rect x="44" y="10" width="8" height="14" fill="#8B7355" rx="0.5"/>
      <path d="M44 10 L48 5 L52 10" fill="#8B7355"/>
      <rect x="4" y="16" width="14" height="26" fill="#C4B898" rx="1"/>
      <rect x="2" y="12" width="18" height="6" fill="#B4A888" rx="1"/>
      {[20, 30, 40, 48].map((x, i) => (
        <path key={i} d={`M${x} 40 Q${x + 4} 34 ${x + 8} 40`} fill="#B4A888"/>
      ))}
    </svg>
  )
}
function StickerCzechBeer() {
  return (
    <svg viewBox="0 0 38 50" width="36" height="48" aria-hidden="true">
      <path d="M6 14 Q4 32 6 44 Q18 48 30 44 Q32 32 30 14 Z" fill="#D49A3C" stroke="#C4A882" strokeWidth="1.5"/>
      <path d="M6 14 Q12 8 18 10 Q24 8 30 14" fill="#F5EDD8"/>
      <path d="M8 12 Q14 6 18 8 Q22 6 28 12" fill="#F5F5F5"/>
      <path d="M30 18 Q40 20 40 28 Q40 34 30 36" fill="none" stroke="#C4A882" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="7" y1="26" x2="29" y2="26" stroke="#C4882A" strokeWidth="1.5" opacity="0.6"/>
      <line x1="7" y1="36" x2="29" y2="36" stroke="#C4882A" strokeWidth="1.5" opacity="0.6"/>
      <line x1="6" y1="14" x2="30" y2="14" stroke="#B08830" strokeWidth="2"/>
      <line x1="6" y1="44" x2="30" y2="44" stroke="#B08830" strokeWidth="2"/>
    </svg>
  )
}

/* ── Brussels ───────────────────────────────────────────── */
function StickerAtomium() {
  return (
    <svg viewBox="0 0 52 60" width="50" height="58" aria-hidden="true">
      <line x1="26" y1="6" x2="44" y2="24" stroke="#9C8B6E" strokeWidth="4"/>
      <line x1="26" y1="6" x2="8" y2="24" stroke="#9C8B6E" strokeWidth="4"/>
      <line x1="44" y1="24" x2="44" y2="42" stroke="#9C8B6E" strokeWidth="4"/>
      <line x1="8" y1="24" x2="8" y2="42" stroke="#9C8B6E" strokeWidth="4"/>
      <line x1="44" y1="42" x2="26" y2="54" stroke="#9C8B6E" strokeWidth="4"/>
      <line x1="8" y1="42" x2="26" y2="54" stroke="#9C8B6E" strokeWidth="4"/>
      <line x1="44" y1="24" x2="8" y2="24" stroke="#9C8B6E" strokeWidth="4"/>
      <line x1="44" y1="42" x2="8" y2="42" stroke="#9C8B6E" strokeWidth="4"/>
      <line x1="26" y1="6" x2="26" y2="54" stroke="#9C8B6E" strokeWidth="4" opacity="0.6"/>
      {[[26, 6], [44, 24], [8, 24], [44, 42], [8, 42], [26, 54], [26, 30]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i === 6 ? 9 : 7} fill="#C9A045" stroke="#F5EDD8" strokeWidth="1"/>
      ))}
    </svg>
  )
}
function StickerBelgianWaffle() {
  return (
    <svg viewBox="0 0 52 42" width="50" height="40" aria-hidden="true">
      <rect x="4" y="6" width="44" height="32" fill="#D49A3C" rx="4"/>
      {[12, 20, 28, 36].map((x, i) => (
        <line key={`v${i}`} x1={x} y1="6" x2={x} y2="38" stroke="#B87B2C" strokeWidth="1.8"/>
      ))}
      {[14, 22, 30].map((y, i) => (
        <line key={`h${i}`} x1="4" y1={y} x2="48" y2={y} stroke="#B87B2C" strokeWidth="1.8"/>
      ))}
      {[8, 16, 24, 32, 40].map((x, i) => (
        <circle key={i} cx={x} cy="10" r="1.2" fill="#F5EDD8" opacity="0.8"/>
      ))}
      <path d="M22 2 Q26 0 30 2 Q32 8 26 10 Q20 8 22 2Z" fill="#C62828"/>
      <line x1="26" y1="0" x2="26" y2="-2" stroke="#388E3C" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

/* ── Generic fallback stickers ───────────────────────────── */
function StickerVintageCamera() {
  return (
    <svg viewBox="0 0 52 42" width="50" height="40" aria-hidden="true">
      <rect x="4" y="12" width="44" height="28" fill="#3D2B1F" rx="3"/>
      <rect x="12" y="6" width="16" height="8" fill="#4D3B2F" rx="2"/>
      <rect x="32" y="8" width="12" height="6" fill="#2C1C10" rx="1"/>
      <circle cx="26" cy="28" r="12" fill="#2C1C10" stroke="#6B5335" strokeWidth="2"/>
      <circle cx="26" cy="28" r="9" fill="#1A1A1A"/>
      <circle cx="26" cy="28" r="6" fill="#2C3E50"/>
      <circle cx="26" cy="28" r="3" fill="#1A1A1A"/>
      <circle cx="23" cy="25" r="2" fill="rgba(255,255,255,0.35)"/>
      <circle cx="42" cy="14" r="3.5" fill="#8B6914"/>
      <rect x="2" y="18" width="4" height="8" fill="#2C1C10" rx="1"/>
      <rect x="46" y="18" width="4" height="8" fill="#2C1C10" rx="1"/>
    </svg>
  )
}
function StickerCompass() {
  return (
    <svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#F5EDD8" stroke="#C4A882" strokeWidth="2"/>
      <circle cx="24" cy="24" r="19" fill="none" stroke="#C4A882" strokeWidth="0.8"/>
      <text x="22" y="8" fontSize="7" fontFamily="serif" fill="#3D2B1F" fontWeight="bold">N</text>
      <text x="22" y="43" fontSize="7" fontFamily="serif" fill="#3D2B1F" fontWeight="bold">S</text>
      <text x="38" y="27" fontSize="7" fontFamily="serif" fill="#3D2B1F" fontWeight="bold">E</text>
      <text x="5" y="27" fontSize="7" fontFamily="serif" fill="#3D2B1F" fontWeight="bold">W</text>
      <path d="M24 24 L20 12 L24 14 Z" fill="#C62828"/>
      <path d="M24 24 L28 12 L24 14 Z" fill="#C62828" opacity="0.6"/>
      <path d="M24 24 L20 36 L24 34 Z" fill="#3D2B1F"/>
      <path d="M24 24 L28 36 L24 34 Z" fill="#3D2B1F" opacity="0.6"/>
      <circle cx="24" cy="24" r="2.5" fill="#C4A882"/>
    </svg>
  )
}
function StickerPassport() {
  return (
    <svg viewBox="0 0 40 52" width="38" height="50" aria-hidden="true">
      <rect x="4" y="2" width="32" height="48" fill="#1A2744" rx="3"/>
      <rect x="6" y="4" width="28" height="44" fill="#F5EDD8" rx="2"/>
      <circle cx="20" cy="20" r="9" fill="none" stroke="#C9A045" strokeWidth="1.5"/>
      <circle cx="20" cy="20" r="6" fill="none" stroke="#C9A045" strokeWidth="1"/>
      <text x="16" y="23" fontSize="9" fontFamily="serif" fill="#C9A045">✦</text>
      <line x1="8" y1="34" x2="32" y2="34" stroke="#C4A882" strokeWidth="1.5"/>
      <line x1="8" y1="38" x2="28" y2="38" stroke="#C4A882" strokeWidth="1"/>
      <line x1="8" y1="42" x2="24" y2="42" stroke="#C4A882" strokeWidth="1"/>
      <circle cx="28" cy="40" r="6" fill="none" stroke="#C62828" strokeWidth="1.5" opacity="0.8"/>
      <text x="25" y="42" fontSize="5" fontFamily="serif" fill="#C62828" opacity="0.8">VISA</text>
    </svg>
  )
}
function StickerTrainTicket() {
  return (
    <svg viewBox="0 0 60 28" width="58" height="26" aria-hidden="true">
      <path d="M2 4 Q2 2 4 2 L56 2 Q58 2 58 4 L58 24 Q58 26 56 26 L4 26 Q2 26 2 24 Z" fill="#E8DCC8"/>
      <line x1="14" y1="2" x2="14" y2="26" stroke="#C4A882" strokeWidth="1" strokeDasharray="2,2"/>
      <rect x="3" y="8" width="10" height="12" fill="#C9A045" opacity="0.3" rx="1"/>
      <line x1="18" y1="10" x2="50" y2="10" stroke="#9C8B6E" strokeWidth="1.5"/>
      <line x1="18" y1="15" x2="50" y2="15" stroke="#9C8B6E" strokeWidth="1"/>
      <line x1="18" y1="20" x2="40" y2="20" stroke="#9C8B6E" strokeWidth="1"/>
      <circle cx="8" cy="14" r="3" fill="none" stroke="#C4A882" strokeWidth="1.5"/>
    </svg>
  )
}
function StickerMapPin() {
  return (
    <svg viewBox="0 0 30 44" width="28" height="42" aria-hidden="true">
      <path d="M4 16 Q4 2 15 2 Q26 2 26 16 Q26 26 15 40 Q4 26 4 16Z" fill="#C62828"/>
      <circle cx="15" cy="15" r="6" fill="#F5EDD8" opacity="0.9"/>
      <circle cx="15" cy="15" r="3" fill="#C62828"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   SEMANTIC STICKERS — driven by the user's photo note text
═══════════════════════════════════════════════════════════ */

function StickerAlpineAttire() {
  return (
    <svg viewBox="0 0 52 62" width="50" height="60" aria-hidden="true">
      {/* Bavarian hat with feather */}
      <path d="M14 8 Q16 2 26 2 Q36 2 38 8 Q40 12 36 14 L16 14 Q12 12 14 8Z" fill="#3D2B1F"/>
      <path d="M38 8 Q44 6 46 10 Q44 14 38 12" fill="#2C1C10"/>
      <path d="M36 6 Q40 0 44 4" fill="none" stroke="#388E3C" strokeWidth="2.5" strokeLinecap="round"/>
      {/* lederhosen bib */}
      <path d="M16 14 Q10 18 10 28 L42 28 Q42 18 36 14 Z" fill="#8B6914"/>
      {/* suspenders cross */}
      <line x1="20" y1="14" x2="32" y2="28" stroke="#C9A045" strokeWidth="2.5"/>
      <line x1="32" y1="14" x2="20" y2="28" stroke="#C9A045" strokeWidth="2.5"/>
      {/* H-piece */}
      <line x1="24" y1="20" x2="28" y2="20" stroke="#C9A045" strokeWidth="2"/>
      {/* shorts */}
      <path d="M10 28 L10 46 Q18 50 26 48 Q34 50 42 46 L42 28 Z" fill="#8B6914"/>
      {/* embroidery border on shorts */}
      <path d="M10 34 Q26 38 42 34" fill="none" stroke="#C9A045" strokeWidth="1.5" strokeDasharray="2,2"/>
      {/* legs */}
      <rect x="12" y="46" width="10" height="14" fill="#F5EDD8" rx="2"/>
      <rect x="30" y="46" width="10" height="14" fill="#F5EDD8" rx="2"/>
      {/* shoe buckles */}
      <rect x="11" y="58" width="12" height="4" fill="#3D2B1F" rx="1"/>
      <rect x="29" y="58" width="12" height="4" fill="#3D2B1F" rx="1"/>
    </svg>
  )
}

function StickerFolkCostume() {
  return (
    <svg viewBox="0 0 48 64" width="46" height="62" aria-hidden="true">
      {/* head */}
      <circle cx="24" cy="8" r="7" fill="#F5C6A0"/>
      {/* hair / headdress */}
      <path d="M17 6 Q18 0 24 0 Q30 0 31 6 Q28 4 24 5 Q20 4 17 6Z" fill="#3D2B1F"/>
      {/* folk headband */}
      <path d="M17 6 Q24 4 31 6" fill="none" stroke="#C62828" strokeWidth="3" strokeLinecap="round"/>
      {/* bodice */}
      <path d="M16 16 Q10 20 10 32 L38 32 Q38 20 32 16 Z" fill="#C62828"/>
      {/* embroidered bodice detail */}
      <path d="M18 18 Q24 16 30 18" fill="none" stroke="#F5D27A" strokeWidth="1.5"/>
      <circle cx="24" cy="22" r="2" fill="#F5D27A"/>
      <circle cx="19" cy="26" r="1.5" fill="#F5D27A"/>
      <circle cx="29" cy="26" r="1.5" fill="#F5D27A"/>
      {/* white blouse puff sleeves */}
      <path d="M16 16 Q8 14 6 22 Q8 26 14 24" fill="#F5EDD8" stroke="#E0D5C0" strokeWidth="1"/>
      <path d="M32 16 Q40 14 42 22 Q40 26 34 24" fill="#F5EDD8" stroke="#E0D5C0" strokeWidth="1"/>
      {/* skirt with embroidery */}
      <path d="M10 32 Q6 36 8 50 Q16 56 24 56 Q32 56 40 50 Q42 36 38 32 Z" fill="#1565C0"/>
      <path d="M8 40 Q24 46 40 40" fill="none" stroke="#F5D27A" strokeWidth="2" strokeDasharray="2,2"/>
      <path d="M9 48 Q24 54 39 48" fill="none" stroke="#F5D27A" strokeWidth="1.5" strokeDasharray="2,2"/>
      {/* apron */}
      <path d="M16 32 Q16 50 24 52 Q32 50 32 32 Z" fill="#F5EDD8" opacity="0.85"/>
      <path d="M17 38 Q24 42 31 38" fill="none" stroke="#C4A882" strokeWidth="1"/>
    </svg>
  )
}

function StickerKilt() {
  return (
    <svg viewBox="0 0 50 58" width="48" height="56" aria-hidden="true">
      {/* sporran (pouch) */}
      <path d="M18 20 Q18 14 25 14 Q32 14 32 20 Q32 26 25 26 Q18 26 18 20Z" fill="#8B6914"/>
      <line x1="22" y1="14" x2="28" y2="14" stroke="#8B6914" strokeWidth="2"/>
      {/* belt */}
      <rect x="8" y="20" width="34" height="4" fill="#3D2B1F" rx="1"/>
      <rect x="22" y="18" width="6" height="8" fill="#C9A045" rx="1"/>
      {/* kilt – tartan pattern */}
      <path d="M8 24 L8 52 Q25 58 42 52 L42 24 Z" fill="#C62828"/>
      {/* tartan lines horizontal */}
      {[30, 36, 42, 48].map((y, i) => (
        <line key={i} x1="8" y1={y} x2="42" y2={y} stroke="#1565C0" strokeWidth={i % 2 === 0 ? "2.5" : "1.2"}/>
      ))}
      {/* tartan lines vertical */}
      {[14, 20, 26, 32, 38].map((x, i) => (
        <line key={i} x1={x} y1="24" x2={x} y2="52" stroke="#1565C0" strokeWidth={i % 2 === 0 ? "2.5" : "1.2"}/>
      ))}
      {/* kilt pleats */}
      <line x1="12" y1="24" x2="12" y2="52" stroke="#9C1B1B" strokeWidth="1" opacity="0.5"/>
      <line x1="18" y1="24" x2="18" y2="52" stroke="#9C1B1B" strokeWidth="1" opacity="0.5"/>
      {/* white shirt / socks visible */}
      <rect x="20" y="52" width="10" height="6" fill="#F5EDD8" rx="1"/>
    </svg>
  )
}

function StickerFez() {
  return (
    <svg viewBox="0 0 44 52" width="42" height="50" aria-hidden="true">
      {/* tassel */}
      <line x1="22" y1="4" x2="22" y2="16" stroke="#3D2B1F" strokeWidth="1.5"/>
      {[18, 20, 22, 24, 26].map((x, i) => (
        <line key={i} x1={x} y1="14" x2={x - 2 + i} y2="24" stroke="#3D2B1F" strokeWidth="1" strokeLinecap="round"/>
      ))}
      {/* fez body */}
      <path d="M8 16 Q8 4 22 4 Q36 4 36 16 L40 36 Q40 40 22 40 Q4 40 4 36 Z" fill="#C62828"/>
      {/* rim band */}
      <path d="M4 36 Q22 44 40 36" fill="none" stroke="#1A1A1A" strokeWidth="3"/>
      <path d="M4 36 Q22 42 40 36" fill="none" stroke="#3D2B1F" strokeWidth="1.5"/>
      {/* crescent decoration on front */}
      <path d="M16 22 Q14 16 18 14 Q22 13 24 16 Q20 15 19 18 Q20 22 16 22Z" fill="#C9A045"/>
      <circle cx="26" cy="16" r="2.5" fill="#C9A045" opacity="0.9"/>
    </svg>
  )
}

function StickerMountain() {
  return (
    <svg viewBox="0 0 64 48" width="62" height="46" aria-hidden="true">
      {/* sky gradient background */}
      <path d="M0 48 L0 28 L32 4 L64 28 L64 48 Z" fill="#C4D8E8" opacity="0.4"/>
      {/* back mountain */}
      <path d="M10 48 L38 10 L60 48 Z" fill="#B0B8C4" opacity="0.7"/>
      {/* snow cap back */}
      <path d="M38 10 L32 24 L44 24 Z" fill="#F5F5F5" opacity="0.9"/>
      {/* front mountain */}
      <path d="M2 48 L26 8 L52 48 Z" fill="#8B9EB0"/>
      {/* snow cap front */}
      <path d="M26 8 L18 22 L34 22 Z" fill="white"/>
      {/* pine trees at base */}
      <path d="M4 44 L7 36 L10 44 Z" fill="#2E7D32" opacity="0.8"/>
      <path d="M52 44 L55 36 L58 44 Z" fill="#2E7D32" opacity="0.8"/>
      <path d="M46 44 L50 38 L54 44 Z" fill="#388E3C" opacity="0.7"/>
    </svg>
  )
}

function StickerBeach() {
  return (
    <svg viewBox="0 0 60 44" width="58" height="42" aria-hidden="true">
      {/* sky */}
      <rect x="0" y="0" width="60" height="28" fill="#87CEEB" opacity="0.5"/>
      {/* sun */}
      <circle cx="46" cy="12" r="8" fill="#F5D27A"/>
      {[0, 45, 90, 135].map((angle, i) => {
        const r = angle * Math.PI / 180
        return <line key={i} x1={46 + 11 * Math.cos(r)} y1={12 + 11 * Math.sin(r)} x2={46 + 14 * Math.cos(r)} y2={12 + 14 * Math.sin(r)} stroke="#F5D27A" strokeWidth="2.5" strokeLinecap="round"/>
      })}
      {/* water */}
      <path d="M0 26 Q15 22 30 26 Q45 30 60 26 L60 36 L0 36 Z" fill="#5B9EC9" opacity="0.8"/>
      <path d="M0 32 Q20 28 40 32 Q50 34 60 32 L60 38 L0 38 Z" fill="#4A8EC0" opacity="0.7"/>
      {/* sand beach */}
      <path d="M0 36 L0 44 L60 44 L60 36 Q45 40 30 38 Q15 36 0 36Z" fill="#D49A3C" opacity="0.8"/>
      {/* wave crests */}
      <path d="M5 28 Q12 24 18 28" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7"/>
      <path d="M28 30 Q36 26 42 30" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7"/>
    </svg>
  )
}

function StickerMuseumFrame() {
  return (
    <svg viewBox="0 0 50 46" width="48" height="44" aria-hidden="true">
      {/* outer ornate frame */}
      <rect x="2" y="2" width="46" height="42" fill="#C9A045" rx="2"/>
      <rect x="6" y="6" width="38" height="34" fill="#F5EDD8" rx="1"/>
      {/* frame decorative corners */}
      <circle cx="6" cy="6" r="3" fill="#A87428"/>
      <circle cx="44" cy="6" r="3" fill="#A87428"/>
      <circle cx="6" cy="40" r="3" fill="#A87428"/>
      <circle cx="44" cy="40" r="3" fill="#A87428"/>
      {/* abstract painting inside */}
      <rect x="8" y="8" width="34" height="30" fill="#EAE3D2"/>
      {/* landscape painting */}
      <path d="M8 30 Q16 20 24 24 Q32 18 42 26 L42 38 L8 38 Z" fill="#7CB342" opacity="0.7"/>
      <path d="M8 8 Q10 20 16 24" fill="none" stroke="#C9A045" strokeWidth="2" opacity="0.5"/>
      <circle cx="34" cy="14" r="6" fill="#F5D27A" opacity="0.7"/>
      {/* clouds */}
      <ellipse cx="20" cy="14" rx="7" ry="4" fill="white" opacity="0.8"/>
      <ellipse cx="26" cy="12" rx="5" ry="3.5" fill="white" opacity="0.8"/>
    </svg>
  )
}

function StickerMusicNote() {
  return (
    <svg viewBox="0 0 44 52" width="42" height="50" aria-hidden="true">
      {/* quarter note */}
      <ellipse cx="14" cy="40" rx="8" ry="6" fill="#3D2B1F" transform="rotate(-20 14 40)"/>
      <line x1="22" y1="38" x2="22" y2="6" stroke="#3D2B1F" strokeWidth="3" strokeLinecap="round"/>
      {/* eighth note */}
      <ellipse cx="30" cy="44" rx="7" ry="5" fill="#3D2B1F" transform="rotate(-20 30 44)"/>
      <line x1="37" y1="42" x2="37" y2="14" stroke="#3D2B1F" strokeWidth="3" strokeLinecap="round"/>
      {/* beam connecting the two */}
      <path d="M22 6 Q30 10 37 14" fill="none" stroke="#3D2B1F" strokeWidth="3"/>
      {/* sparkles */}
      <circle cx="8" cy="12" r="2" fill="#C9A045" opacity="0.8"/>
      <circle cx="40" cy="6" r="1.5" fill="#C9A045" opacity="0.7"/>
      <path d="M4 20 L6 16 L8 20 L4 18 L8 18 Z" fill="#C9A045" opacity="0.6"/>
    </svg>
  )
}

function StickerCocktailGlass() {
  return (
    <svg viewBox="0 0 38 56" width="36" height="54" aria-hidden="true">
      {/* martini glass – wide top narrowing to stem */}
      <path d="M4 6 L34 6 L19 28 Z" fill="#2B5F8E" opacity="0.88"/>
      {/* rim */}
      <line x1="4" y1="6" x2="34" y2="6" stroke="#9C8B6E" strokeWidth="1.5"/>
      {/* liquid fill inside */}
      <path d="M8 6 L30 6 L19 24 Z" fill="#C4622D" opacity="0.85"/>
      {/* stem */}
      <line x1="19" y1="28" x2="19" y2="44" stroke="#9C8B6E" strokeWidth="2.5" strokeLinecap="round"/>
      {/* foot */}
      <ellipse cx="19" cy="46" rx="12" ry="3" fill="#9C8B6E"/>
      {/* olive on a stick */}
      <line x1="12" y1="4" x2="26" y2="10" stroke="#6B4C2A" strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="12" cy="4" rx="3.5" ry="3" fill="#388E3C"/>
      <circle cx="12" cy="4" r="1.5" fill="#C62828"/>
      {/* bubbles */}
      <circle cx="16" cy="14" r="1.5" fill="rgba(255,255,255,0.5)"/>
      <circle cx="21" cy="18" r="1" fill="rgba(255,255,255,0.4)"/>
    </svg>
  )
}

function StickerMarketStall() {
  return (
    <svg viewBox="0 0 64 44" width="62" height="42" aria-hidden="true">
      {/* awning */}
      <path d="M2 16 L2 10 Q32 4 62 10 L62 16 Z" fill="#C62828"/>
      {/* awning scallop edge */}
      {[4, 12, 20, 28, 36, 44, 52].map((x, i) => (
        <path key={i} d={`M${x} 16 Q${x + 4} 22 ${x + 8} 16`} fill="#C62828"/>
      ))}
      {/* stand surface */}
      <rect x="4" y="22" width="56" height="4" fill="#D4A017"/>
      {/* stand support legs */}
      <line x1="8" y1="26" x2="6" y2="44" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="56" y1="26" x2="58" y2="44" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round"/>
      {/* produce items on stand */}
      <circle cx="16" cy="20" r="4" fill="#E91E63" opacity="0.9"/>
      <circle cx="26" cy="19" r="5" fill="#F44336" opacity="0.85"/>
      <circle cx="36" cy="20" r="4" fill="#FF9800" opacity="0.9"/>
      <circle cx="46" cy="19" r="4.5" fill="#8BC34A" opacity="0.85"/>
      {/* leaf details */}
      <path d="M36 15 Q38 12 40 15" fill="none" stroke="#388E3C" strokeWidth="1.5"/>
      <path d="M16 16 Q18 13 20 16" fill="none" stroke="#388E3C" strokeWidth="1.5"/>
    </svg>
  )
}

function StickerRuins() {
  return (
    <svg viewBox="0 0 60 52" width="58" height="50" aria-hidden="true">
      {/* broken column left */}
      <rect x="6" y="20" width="10" height="28" fill="#D4C8A8" rx="0.5"/>
      <path d="M4 22 Q4 16 11 15 Q18 16 18 22" fill="#E8DCC8" stroke="#D4C8A8" strokeWidth="1"/>
      <line x1="8" y1="20" x2="8" y2="48" stroke="#C4B898" strokeWidth="0.8"/>
      <line x1="11" y1="20" x2="11" y2="48" stroke="#C4B898" strokeWidth="0.8"/>
      {/* broken top piece */}
      <path d="M4 22 L6 18 L14 20 L16 24" fill="#D4C8A8" opacity="0.7"/>
      {/* middle column (full) */}
      <path d="M24 14 Q24 8 32 7 Q40 8 40 14" fill="#D4C8A8"/>
      <rect x="25" y="12" width="14" height="36" fill="#E8DCC8"/>
      <line x1="30" y1="12" x2="30" y2="48" stroke="#D4C8A8" strokeWidth="1"/>
      <line x1="34" y1="12" x2="34" y2="48" stroke="#D4C8A8" strokeWidth="1"/>
      {/* right column (broken shorter) */}
      <rect x="46" y="30" width="10" height="18" fill="#D4C8A8" rx="0.5"/>
      <path d="M44 32 Q44 26 51 25 Q58 26 58 32" fill="#E8DCC8" stroke="#D4C8A8" strokeWidth="1"/>
      {/* ground line with stones */}
      <rect x="2" y="48" width="56" height="4" fill="#C4B898" rx="1"/>
      {/* fallen stone */}
      <path d="M16 42 Q22 40 24 44 L18 48 Z" fill="#C4A882"/>
      {/* grass tufts */}
      <path d="M10 48 Q12 42 14 48" fill="none" stroke="#558B2F" strokeWidth="1.5"/>
      <path d="M38 48 Q40 42 42 48" fill="none" stroke="#558B2F" strokeWidth="1.5"/>
    </svg>
  )
}

function StickerBike() {
  return (
    <svg viewBox="0 0 66 46" width="64" height="44" aria-hidden="true">
      {/* rear wheel */}
      <circle cx="14" cy="34" r="11" fill="none" stroke="#3D2B1F" strokeWidth="3"/>
      <circle cx="14" cy="34" r="4" fill="none" stroke="#3D2B1F" strokeWidth="2"/>
      {[0, 60, 120].map((a, i) => {
        const r = a * Math.PI / 180
        return <line key={i} x1={14 + 4 * Math.cos(r)} y1={34 + 4 * Math.sin(r)} x2={14 + 10 * Math.cos(r)} y2={34 + 10 * Math.sin(r)} stroke="#3D2B1F" strokeWidth="1.5"/>
      })}
      {/* front wheel */}
      <circle cx="52" cy="34" r="11" fill="none" stroke="#3D2B1F" strokeWidth="3"/>
      <circle cx="52" cy="34" r="4" fill="none" stroke="#3D2B1F" strokeWidth="2"/>
      {[30, 90, 150].map((a, i) => {
        const r = a * Math.PI / 180
        return <line key={i} x1={52 + 4 * Math.cos(r)} y1={34 + 4 * Math.sin(r)} x2={52 + 10 * Math.cos(r)} y2={34 + 10 * Math.sin(r)} stroke="#3D2B1F" strokeWidth="1.5"/>
      })}
      {/* frame */}
      <path d="M14 34 L28 12 L52 34" fill="none" stroke="#9C8B6E" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M28 12 L42 22 L52 34" fill="none" stroke="#9C8B6E" strokeWidth="3"/>
      {/* seat post + seat */}
      <line x1="28" y1="12" x2="28" y2="24" stroke="#9C8B6E" strokeWidth="3" strokeLinecap="round"/>
      <path d="M22 24 Q28 22 34 24" fill="#3D2B1F" stroke="#3D2B1F" strokeWidth="2" strokeLinecap="round"/>
      {/* handlebar */}
      <line x1="46" y1="18" x2="46" y2="10" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M42 10 Q46 8 50 10" fill="none" stroke="#3D2B1F" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

function StickerThermalBath() {
  return (
    <svg viewBox="0 0 62 48" width="60" height="46" aria-hidden="true">
      {/* building dome */}
      <path d="M14 28 Q14 10 31 8 Q48 10 48 28 Z" fill="#C4A882"/>
      {/* small domes */}
      <path d="M6 28 Q6 20 14 18 Q22 20 22 28 Z" fill="#D4B892" opacity="0.8"/>
      <path d="M40 28 Q40 20 48 18 Q56 20 56 28 Z" fill="#D4B892" opacity="0.8"/>
      {/* building body */}
      <rect x="6" y="26" width="50" height="14" fill="#D4B892" rx="1"/>
      {/* water / pool */}
      <path d="M2 40 Q31 46 60 40 L60 46 L2 46 Z" fill="#5B9EC9" opacity="0.7"/>
      {/* steam rising */}
      <path d="M16 36 Q14 30 17 24" fill="none" stroke="#E8E0D4" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      <path d="M31 36 Q29 28 32 22" fill="none" stroke="#E8E0D4" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <path d="M46 36 Q44 30 47 24" fill="none" stroke="#E8E0D4" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      {/* arched windows */}
      <path d="M14 32 Q14 28 18 28 Q22 28 22 32" fill="none" stroke="#C4A882" strokeWidth="1.2"/>
      <path d="M26 32 Q26 28 31 28 Q36 28 36 32" fill="none" stroke="#C4A882" strokeWidth="1.2"/>
      <path d="M40 32 Q40 28 44 28 Q48 28 48 32" fill="none" stroke="#C4A882" strokeWidth="1.2"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   SEMANTIC STICKER — keyword-driven from photo note text
═══════════════════════════════════════════════════════════ */

function getSemanticSticker(note: string, city: string, country: string): Sticker | null {
  const n = note.toLowerCase()
  const c = city.toLowerCase()
  const co = country.toLowerCase()

  // Traditional attire / costume
  if (/\b(attire|costume|dress|clothes|wearing|outfit|uniform|traditional|folk|local wear|cultural wear)\b/.test(n)) {
    if (/switzerland|austria|bavaria|germany/.test(co) || /munich|salzburg|innsbruck|bern/.test(c)) return StickerAlpineAttire
    if (/turkey|ottoman/.test(co) || /istanbul|ankara/.test(c)) return StickerFez
    if (/scotland|uk|britain/.test(co) || /edinburgh|glasgow|highland/.test(c)) return StickerKilt
    return StickerFolkCostume
  }

  // Ruins / ancient / historical
  if (/\b(ruins|ancient|ruin|archaeological|excavation|old town|historic|medieval|roman|greek|temple|amphitheater)\b/.test(n)) return StickerRuins

  // Market / souk / bazaar / shopping
  if (/\b(market|bazaar|souk|street stall|vendor|shop|stall|spice|produce|grocery)\b/.test(n)) return StickerMarketStall

  // Mountain / hiking / nature
  if (/\b(hik|mountain|peak|summit|trail|trek|alps|climbing|snowcap|glacier|view from)\b/.test(n)) return StickerMountain

  // Beach / sea / swimming
  if (/\b(beach|swim|ocean|sea|coast|waves|sunset over water|sand|shore|bay)\b/.test(n)) return StickerBeach

  // Museum / art / gallery
  if (/\b(museum|gallery|art|exhibit|collection|painting|sculpture|artwork|canvas|portrait)\b/.test(n)) return StickerMuseumFrame

  // Music / concert / performance
  if (/\b(music|concert|band|show|perform|opera|theater|sing|song|dance|festival|orchestra)\b/.test(n)) return StickerMusicNote

  // Nightlife / cocktails / bar
  if (/\b(night|cocktail|bar|pub|club|drink|cheers|toast|glass|wine tasting|brewery|nightlife)\b/.test(n)) return StickerCocktailGlass

  // Cycling / bike / bicycle
  if (/\b(bike|cycl|bicycle|riding|cycle tour|velodrome)\b/.test(n)) return StickerBike

  // Thermal bath / spa / hot spring
  if (/\b(bath|spa|thermal|soak|hot spring|hammam|sauna|wellness)\b/.test(n)) return StickerThermalBath

  return null
}

/* ═══════════════════════════════════════════════════════════
   CITY CONFIGURATION
═══════════════════════════════════════════════════════════ */

interface CityConfig {
  accent: string
  second: string
  localName: string | null
  flagEmoji: string
  stickers: [Sticker, Sticker, Sticker, Sticker, Sticker, Sticker]
}

function getCityConfig(city: string, country: string): CityConfig {
  const c = city.toLowerCase()
  const co = country.toLowerCase()

  if (c.includes('istanbul') || c.includes('ankara') || c.includes('izmir') || co.includes('turkey'))
    return { accent: '#1565C0', second: '#E91E63', localName: 'İSTANBUL', flagEmoji: '🇹🇷',
      stickers: [StickerBlueMosque, StickerEvilEye, StickerTulip, StickerTurkishTea, StickerBalava, StickerGrandBazaarArch] }
  if (c.includes('venice') || c.includes('venezia'))
    return { accent: '#1565C0', second: '#D4A017', localName: 'VENEZIA', flagEmoji: '🇮🇹',
      stickers: [StickerGondola, StickerCarnivalMask, StickerRialtoBridge, StickerWineglass, StickerCampanile, StickerRomanColumn] }
  if (c.includes('rome') || c.includes('roma'))
    return { accent: '#C62828', second: '#D4A017', localName: 'ROMA', flagEmoji: '🇮🇹',
      stickers: [StickerColosseum, StickerPizzaSlice, StickerVespa, StickerGelatoCone, StickerRomanColumn, StickerWineglass] }
  if (c.includes('florence') || c.includes('firenze'))
    return { accent: '#8D4004', second: '#D4A017', localName: 'FIRENZE', flagEmoji: '🇮🇹',
      stickers: [StickerRomanColumn, StickerWineglass, StickerCroissant, StickerGelatoCone, StickerFleurDeLis, StickerAmphora] }
  if (c.includes('naples') || c.includes('napoli'))
    return { accent: '#C62828', second: '#D4A017', localName: 'NAPOLI', flagEmoji: '🇮🇹',
      stickers: [StickerPizzaSlice, StickerVespa, StickerColosseum, StickerGelatoCone, StickerAmphora, StickerWineglass] }
  if (co.includes('italy'))
    return { accent: '#1A237E', second: '#D4A017', localName: city.toUpperCase(), flagEmoji: '🇮🇹',
      stickers: [StickerRomanColumn, StickerWineglass, StickerGelatoCone, StickerPizzaSlice, StickerVespa, StickerAmphora] }
  if (c.includes('paris') || co.includes('france'))
    return { accent: '#1565C0', second: '#C62828', localName: 'PARIS', flagEmoji: '🇫🇷',
      stickers: [StickerEiffelTower, StickerCroissant, StickerArcDeTriomphe, StickerMacaron, StickerBaguette, StickerFleurDeLis] }
  if (c.includes('london') || c.includes('oxford') || c.includes('bath') || c.includes('york') || c.includes('bristol') || c.includes('edinburgh') || co.includes('united kingdom'))
    return { accent: '#C62828', second: '#1565C0', localName: c.includes('edinburgh') ? 'EDINBURGH' : 'LONDON', flagEmoji: c.includes('edinburgh') ? '🏴󠁧󠁢󠁳󠁣󠁴󠁿' : '🇬🇧',
      stickers: [StickerBigBen, StickerRedBus, StickerTowerBridge, StickerPhoneBox, StickerCrown, StickerTeaCup] }
  if (c.includes('vienna') || c.includes('wien') || c.includes('salzburg') || co.includes('austria'))
    return { accent: '#1B5E20', second: '#C9A86C', localName: c.includes('salzburg') ? 'SALZBURG' : 'WIEN', flagEmoji: '🇦🇹',
      stickers: [StickerSchoenbrunn, StickerSachertorte, StickerViennaCoffee, StickerRiesenrad, StickerOperaMask, StickerWineglass] }
  if (c.includes('budapest') || co.includes('hungary'))
    return { accent: '#B71C1C', second: '#D4A017', localName: 'BUDAPEST', flagEmoji: '🇭🇺',
      stickers: [StickerChainBridge, StickerParliamentBudapest, StickerPaprika, StickerRubiksCube, StickerCzechBeer, StickerThermalBath] }
  if (c.includes('prague') || c.includes('brno') || co.includes('czech'))
    return { accent: '#1B5E20', second: '#8D6E63', localName: c.includes('brno') ? 'BRNO' : 'PRAHA', flagEmoji: '🇨🇿',
      stickers: [StickerAstronomicalClock, StickerPragueCastle, StickerCzechBeer, StickerVintageCamera, StickerMapPin, StickerCompass] }
  if (c.includes('brussels') || c.includes('bruges') || c.includes('ghent') || co.includes('belgium'))
    return { accent: '#B71C1C', second: '#D4A017', localName: 'BRUSSEL', flagEmoji: '🇧🇪',
      stickers: [StickerAtomium, StickerBelgianWaffle, StickerCzechBeer, StickerCrown, StickerCompass, StickerWineglass] }
  if (co.includes('switzerland'))
    return { accent: '#C62828', second: '#FFFFFF', localName: city.toUpperCase(), flagEmoji: '🇨🇭',
      stickers: [StickerMountain, StickerRiesenrad, StickerSachertorte, StickerViennaCoffee, StickerCompass, StickerTrainTicket] }
  if (c.includes('athens') || co.includes('greece'))
    return { accent: '#1565C0', second: '#E8DCC8', localName: 'ΑΘΗΝΑ', flagEmoji: '🇬🇷',
      stickers: [StickerParthenon, StickerAmphora, StickerOliveBranch, StickerWineglass, StickerBeach, StickerCompass] }
  if (co.includes('germany'))
    return { accent: '#1A237E', second: '#C9A86C', localName: city.toUpperCase(), flagEmoji: '🇩🇪',
      stickers: [StickerCzechBeer, StickerBelgianWaffle, StickerRiesenrad, StickerVintageCamera, StickerCompass, StickerTrainTicket] }
  if (co.includes('croatia'))
    return { accent: '#B71C1C', second: '#1565C0', localName: city.toUpperCase(), flagEmoji: '🇭🇷',
      stickers: [StickerBeach, StickerWineglass, StickerOliveBranch, StickerCompass, StickerVintageCamera, StickerMapPin] }
  if (co.includes('poland'))
    return { accent: '#C62828', second: '#FFFFFF', localName: city.toUpperCase(), flagEmoji: '🇵🇱',
      stickers: [StickerCrown, StickerCzechBeer, StickerRuins, StickerCompass, StickerVintageCamera, StickerTrainTicket] }

  return { accent: '#5D4037', second: '#C9A86C', localName: city.toUpperCase() || null, flagEmoji: '✈️',
    stickers: [StickerVintageCamera, StickerCompass, StickerMapPin, StickerTrainTicket, StickerPassport, StickerTeaCup] }
}

/* ═══════════════════════════════════════════════════════════
   PHOTO CORNER BRACKETS
═══════════════════════════════════════════════════════════ */

function CornerBrackets({ color = '#C9A086', size = 15, weight = 3 }: { color?: string; size?: number; weight?: number }) {
  const base: React.CSSProperties = {
    position: 'absolute', width: size, height: size,
    borderColor: color, borderStyle: 'solid',
  }
  return (
    <>
      <div style={{ ...base, top: -1, left: -1, borderWidth: `${weight}px 0 0 ${weight}px` }} />
      <div style={{ ...base, top: -1, right: -1, borderWidth: `${weight}px ${weight}px 0 0` }} />
      <div style={{ ...base, bottom: -1, left: -1, borderWidth: `0 0 ${weight}px ${weight}px` }} />
      <div style={{ ...base, bottom: -1, right: -1, borderWidth: `0 ${weight}px ${weight}px 0` }} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   STICKER RENDERER
═══════════════════════════════════════════════════════════ */

function EphemeraSticker({ StickerComponent, rotation = 0, scale = 1 }: {
  StickerComponent: Sticker
  rotation?: number
  scale?: number
}) {
  return (
    <div aria-hidden="true" style={{
      display: 'inline-block',
      transform: `rotate(${rotation}deg) scale(${scale})`,
      transformOrigin: 'center center',
      filter: 'drop-shadow(1px 2px 4px rgba(0,0,0,0.22))',
      flexShrink: 0,
    }}>
      <StickerComponent />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PHOTO CARD
   Fill-parent design: the parent defines width+height via
   aspect-ratio / flex; the card fills 100% of that space.
   This eliminates all hardcoded pixel heights and produces
   perfectly balanced columns regardless of image dimensions.
═══════════════════════════════════════════════════════════ */

const CAPTION_H = 28 // px reserved for caption strip

function PhotoCard({ quest, rotation, accent, noteSticker, fontSize = 13 }: {
  quest: Quest
  rotation: number
  accent: string
  noteSticker?: Sticker | null
  fontSize?: number
}) {
  const [broken, setBroken] = useState(false)
  const caption = quest.note
    ? `"${quest.note.slice(0, 68)}${quest.note.length > 68 ? '…' : ''}"`
    : quest.title

  return (
    // Outer shell: takes 100 % of whatever slot the grid allocates
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* Polaroid card — absolutely fills its slot, then rotated in-place */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: '#F2ECE0',
          // Polaroid: equal thin mat on 3 sides, wider mat on bottom for caption
          padding: `5px 5px ${CAPTION_H}px`,
          boxSizing: 'border-box',
          boxShadow: '2px 4px 16px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column',
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          transition: 'transform 0.25s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform =
            `rotate(${rotation * 0.15}deg) scale(1.025) translateY(-2px)`
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation}deg)`
        }}
      >
        <CornerBrackets color={accent} size={14} weight={2.5}/>

        {/* Photo area — flexes to fill everything above caption mat */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
          {quest.photoUrl && !broken ? (
            <img
              src={quest.photoUrl}
              alt={quest.title}
              onError={() => setBroken(true)}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                // Anchor slightly above center so faces/subjects aren't cropped.
                // For very tall (portrait) images in landscape slots this keeps
                // the most important content visible.
                objectPosition: 'center 22%',
                display: 'block',
              }}
            />
          ) : (
            // Letterbox placeholder — aged-paper texture so empty area reads
            // as intentional photo mount rather than broken layout
            <div style={{
              width: '100%', height: '100%',
              background: 'repeating-linear-gradient(135deg, #E8DFC8, #E8DFC8 10px, #D4CBAA 10px, #D4CBAA 20px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 26, opacity: 0.32 }}>📷</span>
              <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 8, letterSpacing: '0.14em', color: '#9A8A68', textTransform: 'uppercase' }}>
                No Photo
              </span>
            </div>
          )}

          {quest.solved && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ border: '2px solid #2E7D32', borderRadius: '50%', padding: '4px 12px', transform: 'rotate(-15deg)', opacity: 0.82, background: 'rgba(255,255,255,0.08)' }}>
                <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 11, color: '#2E7D32', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  SOLVED
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Caption strip — fixed height, vertically centered in mat */}
        <div style={{
          position: 'absolute', bottom: 0, left: 5, right: 5,
          height: CAPTION_H,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 1,
        }}>
          <p style={{
            fontFamily: 'Caveat, cursive', fontSize, color: '#3D2B1F',
            fontWeight: 600, lineHeight: 1.2, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
          }}>
            {caption}
          </p>
          {quest.liked === true && (
            <div style={{ padding: '0 6px', border: '1px solid rgba(197,48,26,0.45)', fontFamily: 'Courier Prime, monospace', fontSize: 7, color: '#C52E1A', letterSpacing: '0.14em', textTransform: 'uppercase', transform: 'rotate(1.2deg)', lineHeight: '14px' }}>
              ★ Loved It
            </div>
          )}
        </div>
      </div>

      {/* Semantic note sticker — stuck to the bottom-right corner */}
      {noteSticker && (
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: -6, right: -8, zIndex: 10,
          transform: `rotate(${13 + rotation * 0.35}deg)`,
          background: '#FFFAF0',
          padding: 3,
          boxShadow: '1px 2px 5px rgba(0,0,0,0.22)',
          filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.18))',
        }}>
          <div style={{ transform: 'scale(0.52)', transformOrigin: 'top left', display: 'flex' }}>
            {noteSticker({})}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   BINDER SPINE — redesigned with city stickers
═══════════════════════════════════════════════════════════ */

function BinderSpine({ city, country, config, spineStickers }: {
  city: string
  country: string
  config: CityConfig
  spineStickers: [Sticker, Sticker, Sticker]
}) {
  const rotations = [-10, 7, -6]

  return (
    <div style={{
      width: 124,
      flexShrink: 0,
      background: 'linear-gradient(to bottom, #EDE5C8, #DDD5B4)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 8px 16px',
      position: 'relative',
      borderRight: '2px solid rgba(120,95,40,0.15)',
      overflow: 'hidden',
    }}>
      {/* Subtle paper texture lines */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(90,60,20,0.04) 22px, rgba(90,60,20,0.04) 23px)', pointerEvents: 'none' }} aria-hidden="true"/>

      {/* Binder rings on right edge */}
      <div style={{ position: 'absolute', right: -11, top: 44, display: 'flex', flexDirection: 'column', gap: 62, zIndex: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: 'radial-gradient(circle at 35% 32%, #F0E0A0, #A8820A)', border: '2.5px solid #8B6914', boxShadow: '1px 2px 6px rgba(0,0,0,0.4), inset 0 1px 3px rgba(255,240,180,0.5)' }} />
        ))}
      </div>

      {/* City header */}
      <div style={{ textAlign: 'center', marginBottom: 10, zIndex: 2 }}>
        <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 5, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
          {config.flagEmoji}
        </div>
        {config.localName && (
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 10, fontWeight: 700, color: config.accent, letterSpacing: '0.1em', lineHeight: 1.3, maxWidth: 96, textAlign: 'center' }}>
            {config.localName}
          </div>
        )}
        <div style={{ width: 40, height: 1, background: `${config.accent}44`, margin: '6px auto 0' }} aria-hidden="true"/>
      </div>

      {/* City sticker column — the main content of the spine */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', width: '100%', zIndex: 2, gap: 8, paddingBottom: 8 }}>
        {spineStickers.map((StickerComp, i) => (
          <div key={i} style={{
            transform: `rotate(${rotations[i]}deg)`,
            background: '#FFF9F0',
            padding: '5px 5px',
            boxShadow: '1px 2px 8px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(0,0,0,0.06)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            maxWidth: 100,
          }}>
            <div style={{ transform: 'scale(0.68)', transformOrigin: 'center', display: 'flex' }}>
              <StickerComp />
            </div>
          </div>
        ))}
      </div>

      {/* Country label — vertical text at bottom */}
      <div style={{
        fontFamily: 'Playfair Display, serif',
        fontSize: 8,
        fontWeight: 700,
        color: '#8B7355',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        transform: 'rotate(180deg)',
        marginTop: 6,
        opacity: 0.7,
        zIndex: 2,
      }}>
        {country.toUpperCase()}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ALBUM SPREAD
═══════════════════════════════════════════════════════════ */

/* Rotation sets cycle per spread so photos don't share the same tilt */
const ROTS: [number, number, number][] = [
  [-1.8,  2.4, -2.2],
  [ 2.2, -1.6,  2.6],
  [-2.6,  1.8, -1.4],
  [ 1.4, -2.4,  2.0],
]

function AlbumSpread({ group, city, country, index, config }: {
  group: Quest[]
  city: string
  country: string
  index: number
  config: CityConfig
}) {
  const [r1, r2, r3] = ROTS[index % ROTS.length]
  const [s1, s2, s3, s4, s5, s6] = config.stickers
  const spineSet: [Sticker, Sticker, Sticker] = [s4, s5, s6]

  const sem1 = group[0] ? getSemanticSticker(group[0].note, city, country) : null
  const sem2 = group[1] ? getSemanticSticker(group[1].note, city, country) : null
  const sem3 = group[2] ? getSemanticSticker(group[2].note, city, country) : null

  const count = group.length

  // ── Layout geometry ─────────────────────────────────────
  // PhotoCard fills 100% of its slot. The slots' sizes are
  // driven purely by CSS:
  //   • 1 photo  → full-width slot, aspect-ratio 3/2
  //   • 2 photos → left 58 % (aspect-ratio 4/3) + right 42 %
  //                (stretches to match via align-items: stretch)
  //   • 3 photos → left 57 % (aspect-ratio 4/3) + right 43 %
  //                with two equal flex-1 sub-slots stacked
  // No pixel heights anywhere — the aspect-ratio on the left
  // column sets the row height and both columns always lock to
  // the same value.

  return (
    <div style={{ display: 'flex', maxWidth: 940, margin: '0 auto 28px', boxShadow: '0 6px 28px rgba(0,0,0,0.2)', overflow: 'visible', position: 'relative' }}>
      <BinderSpine city={city} country={country} config={config} spineStickers={spineSet} />

      <div style={{ flex: 1, background: 'linear-gradient(138deg, #F8F4EB 0%, #F5F0E3 45%, #F0EAD8 100%)', padding: '16px 18px 16px', minWidth: 0, position: 'relative', overflow: 'visible' }}>

        {/* ── Title bar ──────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(15px, 2.6vw, 26px)', fontWeight: 700, color: '#2C1C10', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, lineHeight: 1.1 }}>
            {city} Adventure{index > 0 ? ` — Vol. ${index + 1}` : ''}
          </h2>
          <div style={{ flexShrink: 0, background: '#FFF9C4', border: '1px solid rgba(0,0,0,0.07)', padding: '3px 10px 4px', transform: 'rotate(-2.5deg)', transformOrigin: 'top right', boxShadow: '1px 1px 5px rgba(0,0,0,0.14)', marginTop: -3 }}>
            <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 9, fontWeight: 700, color: '#2C1C10', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', whiteSpace: 'nowrap' }}>
              {city.toUpperCase()} MEMORIES
            </span>
            <div style={{ textAlign: 'center', fontSize: 13, lineHeight: 1.2 }}>{config.flagEmoji}</div>
          </div>
        </div>

        {/* ── Photo collage ─────────────────────────────── */}
        {count === 1 && (
          // Single photo: wide landscape slot, full content width
          <div style={{ aspectRatio: '3/2', position: 'relative' }}>
            <PhotoCard quest={group[0]} rotation={r1} accent={config.accent} noteSticker={sem1} fontSize={14}/>
          </div>
        )}

        {count === 2 && (
          // Two photos side-by-side; left is the hero and drives
          // the row height via aspect-ratio; right stretches to match
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <div style={{ flex: '0 0 58%', aspectRatio: '4/3', position: 'relative' }}>
              <PhotoCard quest={group[0]} rotation={r1} accent={config.accent} noteSticker={sem1} fontSize={14}/>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <PhotoCard quest={group[1]} rotation={r2} accent={config.accent} noteSticker={sem2}/>
            </div>
          </div>
        )}

        {count >= 3 && (
          // Three photos: hero left (sets row height), two stacked right
          // Both columns are always the same height — no whitespace gaps
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            {/* Left hero — aspect-ratio DRIVES the shared row height */}
            <div style={{ flex: '0 0 57%', aspectRatio: '4/3', position: 'relative' }}>
              <PhotoCard quest={group[0]} rotation={r1} accent={config.accent} noteSticker={sem1} fontSize={14}/>
            </div>
            {/* Right column — stretches to exactly match left height */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              {/* Each sub-slot takes an equal share of the column height */}
              <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <PhotoCard quest={group[1]} rotation={r2} accent={config.accent} noteSticker={sem2}/>
              </div>
              <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <PhotoCard quest={group[2]} rotation={r3} accent={config.accent} noteSticker={sem3}/>
              </div>
            </div>
          </div>
        )}

        {/* ── Decorative sticker layer (absolutely placed, no layout impact) ── */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 5 }}>
          <div style={{ position: 'absolute', top: 8, left: -4, transform: 'rotate(-11deg)', filter: 'drop-shadow(1px 2px 4px rgba(0,0,0,0.2))' }}>
            <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left' }}>{s1({})}</div>
          </div>
          <div style={{ position: 'absolute', bottom: 36, right: 6, transform: 'rotate(8deg)', filter: 'drop-shadow(1px 2px 4px rgba(0,0,0,0.2))' }}>
            <div style={{ transform: 'scale(0.58)', transformOrigin: 'bottom right' }}>{s2({})}</div>
          </div>
          {count >= 3 && (
            <div style={{ position: 'absolute', top: '52%', right: -2, transform: 'translateY(-50%) rotate(-7deg)', filter: 'drop-shadow(1px 2px 4px rgba(0,0,0,0.2))' }}>
              <div style={{ transform: 'scale(0.54)', transformOrigin: 'right center' }}>{s3({})}</div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(100,80,40,0.12)' }}>
          <EphemeraSticker StickerComponent={s6} rotation={-9} scale={0.56}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Caveat, cursive', fontSize: 13, color: '#8D6E63', fontWeight: 400 }}>
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span style={{ fontSize: 15, transform: 'rotate(18deg)', display: 'inline-block' }}>✈</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════ */

function EmptyAlbumState({ city, config }: { city: string; config: CityConfig }) {
  const [s1, s2, s3, s4] = config.stickers
  return (
    <div style={{ maxWidth: 940, margin: '0 auto 28px', boxShadow: '0 4px 22px rgba(0,0,0,0.16)', display: 'flex' }}>
      <BinderSpine city={city} country="" config={config} spineStickers={[s4, s4, s4]}/>
      <div style={{ flex: 1, background: 'linear-gradient(138deg, #F8F4EB 0%, #F5F0E3 100%)', padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <EphemeraSticker StickerComponent={s1} rotation={-8} scale={0.85}/>
          <EphemeraSticker StickerComponent={s2} rotation={5} scale={0.9}/>
          <EphemeraSticker StickerComponent={s3} rotation={-4} scale={0.8}/>
          <EphemeraSticker StickerComponent={s4} rotation={7} scale={0.85}/>
        </div>
        <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', fontWeight: 400, color: '#6B4C3B', margin: 0 }}>
          No photographs filed yet.
        </h3>
        <p style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: '#9A7A6A', margin: 0, lineHeight: 1.4 }}>
          Solve a case and submit your evidence photo to begin the {city} record.
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PASSPORT SUMMARY
═══════════════════════════════════════════════════════════ */

function PassportSummary({ quests, city, country }: {
  quests: Quest[]
  city: string
  country: string
}) {
  const solvedTotal = quests.filter(q => q.solved).length
  const totalCases = quests.length
  const pct = totalCases > 0 ? Math.round((solvedTotal / totalCases) * 100) : 0
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const rows = [
    { label: 'LOCATION', val: `${city}, ${country}` },
    { label: 'DATE FILED', val: today },
    { label: 'CASES ASSIGNED', val: String(totalCases) },
    { label: 'CASES CLOSED', val: String(solvedTotal) },
    { label: 'COMPLETION', val: `${pct}%` },
  ]
  return (
    <div style={{ maxWidth: 340, background: 'var(--navy-mid, #151830)', padding: '24px 26px 22px', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>
      <div style={{ position: 'absolute', inset: 6, border: '1px solid rgba(160,126,20,0.22)', pointerEvents: 'none' }} aria-hidden="true" />
      <div style={{ fontFamily: 'Courier Prime, monospace', fontSize: 9, letterSpacing: '0.22em', color: 'rgba(200,168,100,0.55)', textTransform: 'uppercase', marginBottom: 14 }}>── Field Summary ──</div>
      {rows.map(({ label, val }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, gap: 8 }}>
          <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10, color: 'rgba(200,168,100,0.55)', letterSpacing: '0.06em', flexShrink: 0 }}>{label}</span>
          <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 10, color: '#E8DCC8', letterSpacing: '0.04em', textAlign: 'right' }}>{val}</span>
        </div>
      ))}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed rgba(160,126,20,0.2)', display: 'flex', justifyContent: 'center' }}>
        {solvedTotal === totalCases && totalCases > 0 ? (
          <div style={{ border: '2px solid #C9A86C', borderRadius: '50%', padding: '7px 18px', transform: 'rotate(-10deg)' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 13, color: '#C9A86C', letterSpacing: '0.1em', textAlign: 'center', lineHeight: 1.3 }}>
              Investigation<br />Complete
            </div>
          </div>
        ) : (
          <p style={{ fontFamily: 'Crimson Text, serif', fontSize: 13, color: 'rgba(180,155,110,0.5)', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
            {totalCases - solvedTotal} {totalCases - solvedTotal === 1 ? 'case remains' : 'cases remain'} open.
          </p>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ALBUM PAGE — default export
═══════════════════════════════════════════════════════════ */

export type AlbumPageProps = {
  quests: Quest[]
  city: string
  country: string
  allTrips?: StoredTrip[]
}

export default function AlbumPage({ quests, city, country, allTrips = [] }: AlbumPageProps) {
  const destinations = useMemo(() => {
    const map = new Map<string, { country: string; city: string; quests: Quest[] }>()
    for (const trip of allTrips) {
      map.set(`${trip.country}|${trip.city}`, {
        country: trip.country,
        city: trip.city,
        quests: trip.quests as Quest[],
      })
    }
    if (city) {
      map.set(`${country}|${city}`, { country, city, quests })
    }
    return [...map.values()]
  }, [allTrips, city, country, quests])

  const [selectedKey, setSelectedKey] = useState(`${country}|${city}`)
  useEffect(() => {
    if (city) setSelectedKey(`${country}|${city}`)
  }, [city, country])
  const selected = destinations.find(item => `${item.country}|${item.city}` === selectedKey) || destinations[0]
  const activeCity = selected?.city || city
  const activeCountry = selected?.country || country
  const activeQuests = selected?.quests || quests
  const config = useMemo(() => getCityConfig(activeCity, activeCountry), [activeCity, activeCountry])
  const solvedWithPhotos = activeQuests.filter(q => q.solved && q.photoUrl)
  const spreads: Quest[][] = []
  for (let i = 0; i < solvedWithPhotos.length; i += 3) spreads.push(solvedWithPhotos.slice(i, i + 3))

  return (
    <div className="page-enter" style={{ background: '#EAE3D2', minHeight: '100vh', paddingTop: 56 }}>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '24px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
          <div style={{ width: 22, height: 1, background: '#A09070' }} aria-hidden="true" />
          <span style={{ fontFamily: 'Courier Prime, monospace', fontSize: 8, letterSpacing: '0.22em', color: '#A09070', textTransform: 'uppercase' }}>Memory Album</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(20px, 3.5vw, 32px)', fontWeight: 700, color: '#2C1C10', margin: 0 }}>
            The Field Record
          </h1>
          <em style={{ fontFamily: 'Crimson Text, serif', fontSize: 'clamp(14px, 2vw, 18px)', color: config.accent, fontStyle: 'italic' }}>
            {activeCity}{activeCountry ? `, ${activeCountry}` : ''}
          </em>
        </div>
        {destinations.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {destinations.map(item => {
              const key = `${item.country}|${item.city}`
              const active = key === `${activeCountry}|${activeCity}`
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  style={{
                    fontFamily: 'Courier Prime, monospace',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '6px 10px',
                    border: active ? '1px solid #2C1C10' : '1px solid rgba(44,28,16,0.2)',
                    background: active ? '#2C1C10' : 'transparent',
                    color: active ? '#EAE3D2' : '#2C1C10',
                    cursor: 'pointer',
                  }}
                >
                  {item.city}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px' }}>
        {spreads.length > 0
          ? spreads.map((group, i) => <AlbumSpread key={`${activeCity}-${i}`} group={group} city={activeCity} country={activeCountry} index={i} config={config} />)
          : <EmptyAlbumState city={activeCity} config={config} />}
      </div>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '4px 20px 40px' }}>
        <PassportSummary quests={activeQuests} city={activeCity} country={activeCountry} />
      </div>
    </div>
  )
}
