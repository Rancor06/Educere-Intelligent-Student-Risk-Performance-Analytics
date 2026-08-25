import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

load_dotenv()  # reads variables from a local .env file (not committed to git)

def get_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "edutrack_db")
        )
        return conn
    except Error as e:
        print(f"Database connection failed: {e}")
        return None
