import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'黄昏血族 · 血誓牌局',description:'六位血族，一场血誓。离线单人策略卡牌游戏。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" className="dark"><body>{children}</body></html>}
