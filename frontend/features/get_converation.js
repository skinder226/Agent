

export const getConversations = async (Authorization) => {
    try {
        const data = await fetch("http://localhost:8000/chat/get-conversations", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Authorization}`
            }
        });
        let res = await data.json();
        return await res;
    } catch (error) {
        console.log("Error in get_conversations", error);
        return []
    }
}