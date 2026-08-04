export const create_conversation = async (Authorization) => {
    try {
        const data = await fetch("http://localhost:8000/chat/create-conversation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Authorization}`
            }
        });
        let res = await data.json();
        return res;
    } catch (error) {
        console.log("Error in create_conversation", error);
        return []
    }
}