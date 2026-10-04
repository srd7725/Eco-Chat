import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URL } from '..';


const Signup = () => {
  const [user, setUser] = useState({
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });
  const navigate = useNavigate();
  const handleCheckbox = (gender) => {
    setUser({ ...user, gender });
  }
  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BASE_URL}/api/v1/user/register`, user, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      if (res.data.success) {
        navigate("/login");
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response.data.message);
      console.log(error);
    }
    setUser({
      fullName: "",
      username: "",
      password: "",
      confirmPassword: "",
      gender: "",
    })
  }
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className='w-full rounded-lg border border-white/60 bg-gray-900/40 p-5 text-white shadow-xl backdrop-blur-md'>
        <h1 className='mb-4 text-center text-2xl font-bold'>Signup</h1>
        <form onSubmit={onSubmitHandler} action="" className='space-y-3'>
          <div>
            <label htmlFor="fullName" className='mb-1 block text-sm font-medium'>Full Name</label>
            <input
              id="fullName"
              value={user.fullName}
              onChange={(e) => setUser({ ...user, fullName: e.target.value })}
              className='h-10 w-full rounded-md border border-white/25 bg-zinc-900/60 px-3 text-sm text-white placeholder:text-white/55 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/50'
              type="text"
              placeholder='Full Name' />
          </div>
          <div>
            <label htmlFor="username" className='mb-1 block text-sm font-medium'>Username</label>
            <input
              id="username"
              value={user.username}
              onChange={(e) => setUser({ ...user, username: e.target.value })}
              className='h-10 w-full rounded-md border border-white/25 bg-zinc-900/60 px-3 text-sm text-white placeholder:text-white/55 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/50'
              type="text"
              placeholder='Username' />
          </div>
          <div>
            <label htmlFor="password" className='mb-1 block text-sm font-medium'>Password</label>
            <input
              id="password"
              value={user.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              className='h-10 w-full rounded-md border border-white/25 bg-zinc-900/60 px-3 text-sm text-white placeholder:text-white/55 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/50'
              type="password"
              placeholder='Password' />
          </div>
          <div>
            <label htmlFor="confirmPassword" className='mb-1 block text-sm font-medium'>Confirm Password</label>
            <input
              id="confirmPassword"
              value={user.confirmPassword}
              onChange={(e) => setUser({ ...user, confirmPassword: e.target.value })}
              className='h-10 w-full rounded-md border border-white/25 bg-zinc-900/60 px-3 text-sm text-white placeholder:text-white/55 focus:border-white/60 focus:outline-none focus:ring-1 focus:ring-white/50'
              type="password"
              placeholder='Confirm Password' />
          </div>
          <div className='flex items-center justify-center gap-6 py-1'>
            <label htmlFor="male" className='flex cursor-pointer items-center gap-2 text-sm'>
              <input
                id="male"
                name="gender"
                type="radio"
                checked={user.gender === "male"}
                onChange={() => handleCheckbox("male")}
                className="h-4 w-4 accent-white" />
              <span>Male</span>
            </label>
            <label htmlFor="female" className='flex cursor-pointer items-center gap-2 text-sm'>
              <input
                id="female"
                name="gender"
                type="radio"
                checked={user.gender === "female"}
                onChange={() => handleCheckbox("female")}
                className="h-4 w-4 accent-white" />
              <span>Female</span>
            </label>
          </div>
          <p className='py-1 text-center text-sm'>Already have an account? <Link className='font-medium underline underline-offset-2 hover:text-white/80' to="/login">login</Link></p>
          <button type='submit' className='h-10 w-full rounded-md border border-white/50 bg-white/10 text-sm font-semibold text-white transition-colors hover:bg-white/20'>Signup</button>
        </form>
      </div>
    </div>
  )
}

export default Signup