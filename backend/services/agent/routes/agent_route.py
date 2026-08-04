from fastapi import APIRouter
from controllers.agent_controller import agent

router = APIRouter()
router.post("/chat")(agent)