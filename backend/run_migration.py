import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from config import settings

async def main():
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE triage_results ADD COLUMN is_accurate BOOLEAN;"))
            print("Successfully added is_accurate to triage_results")
        except Exception as e:
            print("Error or already added:", e)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
