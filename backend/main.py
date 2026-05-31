import base64
import io
import os
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import matplotlib.pyplot as plt
import pandas as pd
from pydantic import BaseModel

app = FastAPI()

# Configure CORS so your frontend can communicate flawlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.3:5173"  # <-- CRITICAL: Allows frontend requests running via your IP
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file path mappings
LOGO_PATH = os.path.join(os.path.dirname(__file__), "images/logo.svg") # Swapped to vector svg path
ICON_PATH = os.path.join(os.path.dirname(__file__), "images/icon.png")

# --- AUTHENTICATION STRUCTS & SCHEMAS ---

# This schema models exactly what TypeScript sends on form submission
class LoginRequest(BaseModel):
    username: str
    password: str

# Define our static master authentication key token
SECRET_SESSION_TOKEN = "my-super-secret-token-123"


# --- OPEN ENDPOINTS (Public) ---

@app.post("/api/login")
def login(credentials: LoginRequest):
    """
    Validates user credentials and issues a secure application token signature.
    """
    # Matches the exact data schema we discussed
    if credentials.username == "admin" and credentials.password == "secure123":
        return {
            "access_token": SECRET_SESSION_TOKEN,
            "token_type": "bearer"
        }
    
    # Throw an authentication failure exception if validation variables miss
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="The username or password you entered is incorrect."
    )


# --- SECURED ENDPOINTS (Protected) ---

def verify_token(authorization: str = Header(None)):
    """
    Helper dependency function to guard endpoints from anonymous scraping attempts.
    """
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing."
        )
    
    # Extract token string from standard 'Bearer <token>' schema
    try:
        token_type, token_value = authorization.split(" ")
        if token_type.lower() != "bearer" or token_value != SECRET_SESSION_TOKEN:
            raise ValueError()
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Invalid session parameters."
        )


@app.get("/api/logo")
def get_logo(authorization: str = Header(None)):
    # Run our strict security verification check
    verify_token(authorization)
    return FileResponse(LOGO_PATH, media_type="image/svg+xml")


# --- OPEN ENDPOINTS (Public) ---

@app.get("/api/favicon")
def get_favicon():
    """
    Public endpoint: Removed token verification so browsers can 
    freely fetch the tab icon without authentication errors.
    """
    return FileResponse(ICON_PATH, media_type="image/png")


@app.get("/api/dashboard")
def get_dashboard_data(authorization: str = Header(None)):
    # Guard raw metrics data from malicious unauthorized tracking bots
    verify_token(authorization)

    # 1. READ FILE VIA PANDAS (Simulated dataset: Monthly Sales)
    data = {
        "Month": ["Jan", "Feb", "Mar", "Apr", "May"],
        "Sales": [12000, 15000, 11000, 19000, 24000]
    }
    df = pd.DataFrame(data)

    # 2. CALCULATE NUMBERS (Aggregate stats)
    total_sales = int(df["Sales"].sum())
    average_sales = int(df["Sales"].mean())

    # 3. GENERATE THE CHART (Render in memory, don't save to disk!)
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(df["Month"], df["Sales"], marker='o', color='#0075bc', linewidth=2) # Theme aligned color tracking
    ax.set_title("Monthly Sales Growth", fontsize=14, pad=15)
    ax.set_xlabel("Months")
    ax.set_ylabel("Revenue ($)")
    ax.grid(True, linestyle='--', alpha=0.6)
    plt.tight_layout()

    # Convert chart image to a Base64 string that browsers understand inline
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig) # Clean up memory maps completely

    # 4. SEND NUMBERS AND CHART COMBINED
    return {
        "metrics": {
            "totalSales": total_sales,
            "averageSales": average_sales
        },
        "chart": f"data:image/png;base64,{img_base64}"
    }
