import React from 'react'
import { Link } from 'react-router-dom'

export default function NavBar(){
  return (
    <nav className="flex items-center justify-between p-6 bg-transparent">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-3xl bg-cyan-500/20 flex items-center justify-center">H</div>
        <div>
          <div className="text-white font-bold">HydroTech</div>
          <div className="text-slate-300 text-xs">AI Flood Intelligence</div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <Link to="/" className="hover:text-cyan-300">Dashboard</Link>
        <a className="hover:text-cyan-300">Detection</a>
        <a className="hover:text-cyan-300">Reports</a>
        <a className="hover:text-cyan-300">About</a>
      </div>
    </nav>
  )
}
