import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from "react-hot-toast"
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAuthUser } from '../redux/userSlice';
import { BASE_URL } from '..';

const Login = () => {
  const [user, setUser] = useState({
    username: "",
    password: "",
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BASE_URL}/api/v1/user/login`, user, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      navigate("/");
      console.log(res);
      dispatch(setAuthUser(res.data));
    } catch (error) {
      toast.error(error.response.data.message);
      console.log(error);
    }
    setUser({
      username: "",
      password: ""
    })
  }
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className='w-full rounded-lg border border-white/60 bg-gray-900/40 p-5 text-white shadow-xl backdrop-blur-md'>
        <h1 className='mb-4 text-center text-2xl font-bold'>Login</h1>
        <form onSubmit={onSubmitHandler} action="" className='space-y-3'>
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
          <p className='py-1 text-center text-sm'>Don't have an account? <Link className='font-medium underline underline-offset-2 hover:text-white/80' to="/signup">signup</Link></p>
          <button type="submit" className='h-10 w-full rounded-md border border-white/50 bg-white/10 text-sm font-semibold text-white transition-colors hover:bg-white/20'>Login</button>
        </form>
      </div>
    </div>
  )
}

export default Login