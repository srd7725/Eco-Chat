import React, { useState } from 'react'
import { BiSearchAlt2 } from "react-icons/bi";
import OtherUsers from './OtherUsers';
import StatusFeature from './StatusFeature';
import toast from "react-hot-toast";
import {useSelector} from "react-redux";
 
const Sidebar = ({ onOpenSettings, onLogout }) => {
    const [search, setSearch] = useState("");
    const {otherUsers} = useSelector(store=>store.user);

    const searchSubmitHandler = (e) => {
        e.preventDefault();
        const conversationUser = otherUsers?.find((user)=> user.fullName?.toLowerCase().includes(search.toLowerCase()));
        if (!conversationUser && search.trim()) {
            toast.error("User not found!");
        }
    }
    return (
        <div className='flex w-full max-w-[420px] flex-col border-r border-slate-500 bg-slate-900/40 p-4 shadow-inner backdrop-blur-sm md:min-w-[320px]'>
            <form onSubmit={searchSubmitHandler} action="" className='flex items-center gap-2'>
                <input
                    value={search}
                    onChange={(e)=>setSearch(e.target.value)}
                    className='w-full rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30' type="text"
                    placeholder='Search...'
                />
                <button type='submit' className='flex h-10 w-10 items-center justify-center rounded-lg border border-slate-600 bg-zinc-700 text-white transition hover:bg-zinc-600'>
                    <BiSearchAlt2 className='h-5 w-5 outline-none'/>
                </button>
            </form>
            <div className='mt-3'>
                <StatusFeature />
            </div>
            <OtherUsers search={search} />
            <div className='mt-3 flex gap-2 border-t border-white/10 pt-3'>
                <button onClick={onOpenSettings} className='btn btn-sm flex-1'>Settings</button>
                <button onClick={onLogout} className='btn btn-sm flex-1'>Logout</button>
            </div>
        </div>
    )
}

export default Sidebar