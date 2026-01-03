import {create} from 'zustand';

const useUserStore = create((set) => ({
    userid: null,
    isadmin: false,
    username: '',
    voice: '',
    profile: null,
    lat: 0,
    long: 0,
    place: '',
    setUserid: (id) => set({ userid: id }),
    setIsadmin: (v) => set({ isadmin: v }),
    setUsername: (name) => set({ username: name }),
    setVoice: (v) => set({ voice: v }),
    setProfile: (pr) => set({ profile: pr }),
    setLat: (l) => set({ lat: l }),
    setLong: (l) => set({ long: l }),  
    setPlace: (p) => set({ place: p }),
}));

export default useUserStore;