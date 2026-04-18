import os
from typing import Optional, Tuple
from workos import WorkOS
from sqlalchemy.orm import Session
from app.models.auth import User, UserRole

class SSOAdapter:
    """
    WorkOS SSO Adapter for NAMA Enterprise (Phase 5).
    Handles SSO redirect URLs and profile mapping.
    """
    def __init__(self):
        self.api_key = os.getenv("WORKOS_API_KEY", "sk_test_nama_mock")
        self.client_id = os.getenv("WORKOS_CLIENT_ID", "project_nama_mock")
        self.workos = WorkOS(api_key=self.api_key, client_id=self.client_id)

    def get_authorization_url(self, tenant_domain: str, redirect_uri: str) -> str:
        """
        Generate the SSO login URL for a specific tenant domain.
        """
        return self.workos.sso.get_authorization_url(
            domain=tenant_domain,
            redirect_uri=redirect_uri,
            state="nama_sso_v1"
        )

    def authenticate_user(self, db: Session, code: str) -> Tuple[Optional[User], str]:
        """
        Exchange the code for a profile and match/create user in NAMA.
        """
        try:
            profile = self.workos.sso.get_profile_and_token(code).profile
            email = profile.email
            
            # 1. Try to find user by workos_user_id
            user = db.query(User).filter(User.workos_user_id == profile.id).first()
            
            # 2. If not found, try by email
            if not user:
                user = db.query(User).filter(User.email == email).first()
                if user:
                    # Link existing user to WorkOS
                    user.workos_user_id = profile.id
                    user.sso_connection_id = profile.connection_id
                    db.commit()
            
            # 3. If still not found, JIT Provision (Just-In-Time)
            if not user:
                # In Enterprise mode, we might want to auto-provision users
                # to the tenant associated with the SSO domain.
                # For now, we'll return None and let the caller handle it.
                return None, "USER_NOT_FOUND"

            return user, "SUCCESS"
        except Exception as e:
            print(f"SSO Auth Error: {str(e)}")
            return None, str(e)

sso_adapter = SSOAdapter()
