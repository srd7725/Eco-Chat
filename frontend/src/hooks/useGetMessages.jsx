import React, { useEffect } from 'react'
import axios from "axios";
import {useSelector,useDispatch} from "react-redux";
import { mergeMessages, setMessages } from '../redux/messageSlice';
import { BASE_URL } from '..';

const useGetMessages = () => {
    const {selectedUser} = useSelector(store=>store.user);
    const dispatch = useDispatch();
    useEffect(() => {
        let isCurrentRequest = true;
        dispatch(setMessages(null));

        if (!selectedUser?._id) {
            return () => {
                isCurrentRequest = false;
            };
        }

        const fetchMessages = async () => {
            try {
                axios.defaults.withCredentials = true;
                const res = await axios.get(`${BASE_URL}/api/v1/message/${selectedUser?._id}`);
                if (isCurrentRequest) {
                    dispatch(mergeMessages(res.data || []));
                }
            } catch (error) {
                console.log(error);
            }
        }
        fetchMessages();
        return () => {
            isCurrentRequest = false;
        };
    }, [selectedUser?._id, dispatch]);
}

export default useGetMessages