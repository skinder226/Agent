
async function getmessages(conversation_id,token) {
    try {
    const data = await fetch(`http://localhost:8000/chat/get-messages`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                "conversation_id": conversation_id
            })

        }
    )
    const response = await data
    return response.json()
    }
    catch (error) {
        console.log(error)
        return {"error": `Error fetching messages ${error.message}`}
    }  
}

export default getmessages