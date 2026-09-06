import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from './page';
import './globals.css';
class Boundary extends React.Component<{children:React.ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true}}render(){return this.state.error?<main style={{padding:40,color:'#d9c89e',fontFamily:'serif'}}><h1>夜之馆暂时失去了回应</h1><p>请重新打开游戏。自动存档仍保留在浏览器中。</p><button onClick={()=>location.reload()}>重新载入</button></main>:this.props.children}}
createRoot(document.getElementById('root')!).render(<Boundary><Home/></Boundary>);
