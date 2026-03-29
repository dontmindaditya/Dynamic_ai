
from fastapi import APIRouter, Depends
from app.models.credits_models import CreditsResponse, BYOKRequest, BYOKResponse
from app.services.credits_service import get_credits, store_byok_key
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("", response_model=CreditsResponse)
async def fetch_credits(current_user: dict = Depends(get_current_user)):
    return await get_credits(current_user["user_id"])


@router.post("/byok", response_model=BYOKResponse)
async def set_byok(
    request:      BYOKRequest,
    current_user: dict = Depends(get_current_user),
):
    await store_byok_key(
        user_id=current_user["user_id"],
        provider=request.provider,
        raw_key=request.api_key,
    )
    return BYOKResponse(
        message=f"API key stored securely. You will use your own {request.provider} credits.",
        provider=request.provider,
    )