import { createSlice } from "@reduxjs/toolkit";

const statusSlice = createSlice({
    name: "status",
    initialState: {
        statuses: []
    },
    reducers: {
        setStatuses: (state, action) => {
            state.statuses = action.payload || [];
        },
        mergeStatuses: (state, action) => {
            const statusesById = new Map(
                [...(action.payload || []), ...state.statuses].map((status) => [status._id, status])
            );
            state.statuses = Array.from(statusesById.values());
        },
        addStatus: (state, action) => {
            const incomingStatus = action.payload;
            const existingIndex = state.statuses.findIndex(
                (status) => status._id === incomingStatus._id
            );
            if (existingIndex >= 0) {
                state.statuses[existingIndex] = {
                    ...state.statuses[existingIndex],
                    ...incomingStatus
                };
            } else {
                state.statuses.unshift(incomingStatus);
            }
        },
        removeStatus: (state, action) => {
            state.statuses = state.statuses.filter(
                (status) => status._id !== action.payload
            );
        },
        updateStatusView: (state, action) => {
            const { statusId, viewCount, viewer } = action.payload;
            const status = state.statuses.find((item) => item._id === statusId);
            if (!status) return;
            status.viewCount = viewCount;
            if (viewer) {
                status.viewers ||= [];
                const alreadyListed = status.viewers.some((entry) =>
                    String(entry.userId?._id || entry.userId) ===
                    String(viewer.userId?._id || viewer.userId)
                );
                if (!alreadyListed) status.viewers.push(viewer);
            }
        },
        setStatusViewers: (state, action) => {
            const { statusId, viewers, viewCount } = action.payload;
            const status = state.statuses.find((item) => item._id === statusId);
            if (!status) return;
            status.viewers = viewers;
            status.viewCount = viewCount;
        },
        updateStatusOwnerProfile: (state, action) => {
            const updatedUser = action.payload;
            state.statuses.forEach((status) => {
                if (String(status.userId?._id || status.userId) === String(updatedUser._id)) {
                    status.userId = { ...status.userId, ...updatedUser };
                }
            });
        },
        clearStatuses: (state) => {
            state.statuses = [];
        }
    }
});

export const {
    setStatuses,
    mergeStatuses,
    addStatus,
    removeStatus,
    updateStatusView,
    setStatusViewers,
    updateStatusOwnerProfile,
    clearStatuses
} = statusSlice.actions;

export default statusSlice.reducer;
