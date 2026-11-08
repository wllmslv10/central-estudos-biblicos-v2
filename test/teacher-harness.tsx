import React from 'react';import{createRoot}from'react-dom/client';import TeacherWorkspace from '../src/TeacherMode';
createRoot(document.getElementById('root')!).render(<TeacherWorkspace token="test" resource={{kind:'material',id:'11111111-1111-4111-8111-111111111111'}} title="Teste do Modo Professor" mime="text/html" onClose={()=>{}}/>);
