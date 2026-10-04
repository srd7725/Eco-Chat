import React, { useState } from 'react'
import { BiSearchAlt2 } from "react-icons/bi";
import OtherUsers from './OtherUsers';
import StatusFeature from './StatusFeature';
import SettingsPanel from './SettingsPanel';
import axios from "axios";
import toast from "react-hot-toast";
import {useNavigate} from "react-router-dom";
import {useSelector, useDispatch} from "react-redux";
import { setAuthUser, setOtherUsers, setSelectedUser } from '../redux/userSlice';
import { setMessages } from '../redux/messageSlice';
import { clearStatuses } from '../redux/statusSlice';
import { BASE_URL } from '..';
 
const Sidebar = () => {
    const [search, setSearch] = useState("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const {otherUsers} = useSelector(store=>store.user);
    const dispatch = useDispatch();

    const navigate = useNavigate();

    const logoutHandler = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/v1/user/logout`);
            navigate("/login");
            toast.success(res.data.message);
            dispatch(setAuthUser(null));
            dispatch(setMessages(null));
            dispatch(setOtherUsers(null));
            dispatch(setSelectedUser(null));
            dispatch(clearStatuses());
        } catch (error) {
            console.log(error);
        }
    }
    const searchSubmitHandler = (e) => {
        e.preventDefault();
        const conversationUser = otherUsers?.find((user)=> user.fullName?.toLowerCase().includes(search.toLowerCase()));
        if (!conversationUser && search.trim()) {
            toast.error("User not found!");
        }
    }
    return (
        <div className='border-r border-slate-500 p-4 flex flex-col'>
            <form onSubmit={searchSubmitHandler} action="" className='flex items-center gap-2'>
                <input
                    value={search}
                    onChange={(e)=>setSearch(e.target.value)}
                    className='input input-bordered rounded-md' type="text"
                    placeholder='Search...'
                />
                <button type='submit' className='btn bg-zinc-700 text-white'>
                    <BiSearchAlt2 className='w-6 h-6 outline-none'/>
                </button>
            </form>
            <div className="divider px-3"></div>
            <StatusFeature />
            <OtherUsers search={search} />
            <div className='mt-2 flex gap-2'>
                <button onClick={() => setIsSettingsOpen(true)} className='btn btn-sm'>Settings</button>
                <button onClick={logoutHandler} className='btn btn-sm'>Logout</button>
            </div>
            {isSettingsOpen && (
                <SettingsPanel
                    onClose={() => setIsSettingsOpen(false)}
                    onLogout={logoutHandler}
                />
            )}
        </div>
    )
}

export default Sidebar