import React from 'react'
import Navigate from '../../components/navbar/Navigate'
import { Outlet } from 'react-router-dom';
const PageNavbar = () => {
  return (
   <>
    <Navigate />
      <div className="content">
        <Outlet />
      </div>
   </>
  )
}

export default PageNavbar