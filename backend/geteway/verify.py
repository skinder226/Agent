from fastapi import HTTPException, Request
from clerk_backend_api import Clerk, AuthenticateRequestOptions
import os
from dotenv import load_dotenv
load_dotenv()


clerk = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))


def verify_clerk_token(request: Request):
    try:
        request_state = clerk.authenticate_request(
            request,
            AuthenticateRequestOptions(
                authorized_parties=["http://localhost:3000"]
            )
        )
        if not request_state.is_signed_in:
            raise HTTPException(status_code=401, detail="Invalid Clerk token")

        return request_state.payload

    except HTTPException:
        raise
    except Exception as e:
        print("Clerk verification failed:", repr(e))
        raise HTTPException(status_code=401, detail="Invalid Clerk token")