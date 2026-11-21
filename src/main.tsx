import React from 'react';import ReactDOM from 'react-dom/client';import {BrowserRouter,Routes,Route} from 'react-router-dom';
import './index.css';import Home from './pages/Home';import Login from './pages/Login';import Teacher from './pages/Teacher';import Admin from './pages/Admin';import Manage from './pages/Manage';
import {About,Admission,News,Gallery,Contact} from './pages/Site';
ReactDOM.createRoot(document.getElementById('root')!).render(<BrowserRouter><Routes>
<Route path="/" element={<Home/>}/><Route path="/login" element={<Login/>}/><Route path="/teacher" element={<Teacher/>}/><Route path="/admin" element={<Admin/>}/><Route path="/manage" element={<Manage/>}/>
<Route path="/about" element={<About/>}/><Route path="/admission" element={<Admission/>}/><Route path="/news" element={<News/>}/><Route path="/gallery" element={<Gallery/>}/><Route path="/contact" element={<Contact/>}/></Routes></BrowserRouter>);