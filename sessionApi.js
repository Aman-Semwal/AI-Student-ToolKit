// sessionApi.js
// Mock API wrapper around sessionStorage

const SessionAPI = {
    // Generic method to get data
    get: (endpoint) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const data = sessionStorage.getItem(endpoint);
                resolve(data ? JSON.parse(data) : null);
            }, 300); // Simulate network latency
        });
    },

    // Generic method to post/save data
    post: (endpoint, payload) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                sessionStorage.setItem(endpoint, JSON.stringify(payload));
                resolve({ success: true, message: 'Data saved successfully' });
            }, 300);
        });
    },
    
    // Generic method to append data to an array
    append: async (endpoint, item) => {
        const currentData = await SessionAPI.get(endpoint) || [];
        currentData.push(item);
        return SessionAPI.post(endpoint, currentData);
    },

    // Clear session
    clear: () => {
        sessionStorage.clear();
    }
};
