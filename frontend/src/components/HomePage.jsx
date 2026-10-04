import React, { useEffect, useState } from 'react'
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar'
import MessageContainer from './MessageContainer'
import SettingsPanel from './SettingsPanel'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setAuthUser, setOtherUsers, setSelectedUser } from '../redux/userSlice';
import { setMessages } from '../redux/messageSlice';
import { clearStatuses } from '../redux/statusSlice';
import { BASE_URL } from '..';
import useGetRealTimeMessage from '../hooks/useGetRealTimeMessage'

const HomePage = () => {
  const { authUser } = useSelector(store => store.user);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useGetRealTimeMessage();

  const handleLogout = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/v1/user/logout`);
      navigate('/login');
      toast.success(res.data.message);
      dispatch(setAuthUser(null));
      dispatch(setMessages(null));
      dispatch(setOtherUsers(null));
      dispatch(setSelectedUser(null));
      dispatch(clearStatuses());
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (!authUser) {
      navigate("/login");
    }
  }, []);
  return (
    <div className='flex w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg bg-gray-400 bg-clip-padding backdrop-blur-lg bg-opacity-0 sm:h-[450px] md:h-[550px] md:w-[970px]'>
      {isSettingsOpen ? (
        <SettingsPanel
          onClose={() => setIsSettingsOpen(false)}
          onBack={() => setIsSettingsOpen(false)}
          onLogout={handleLogout}
        />
      ) : (
        <>
          <Sidebar
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLogout={handleLogout}
          />
          <MessageContainer />
        </>
      )}
    </div>
  )
}

export default HomePage