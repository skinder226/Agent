export const getConversations = async (Authorization,page = 1) => {
    try {
        const data = await fetch(`http://localhost:8000/chat/get-conversations?page=${page}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Authorization}`
            }
        });
        let res = await data.json();
        return res;
    } catch (error) {
        console.log("Error in get_conversations", error);
        return []
    }
}