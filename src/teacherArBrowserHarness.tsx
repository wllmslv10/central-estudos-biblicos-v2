import React from 'react'
import {createRoot} from 'react-dom/client'
import {SlideBibleReferences} from './TeacherMode'
export function mountTeacherArBrowserHarness(){
 const host=document.createElement('div');host.id='teacher-ar-regression';document.body.append(host)
 const root=createRoot(host)
 root.render(<SlideBibleReferences references={['Mateus 4:8-10']} translation="AR" />)
 return ()=>{root.unmount();host.remove()}
}
