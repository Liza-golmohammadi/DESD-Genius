from pathlib import Path

FILES = [
    "backend/ai_service/services/quality_classifier.py",
    "backend/ai_service/serializers.py",
    "frontend/src/pages/ProducerDashboard.tsx",
]

out = Path("ai_demo_debug_small.txt")
out.write_text("", encoding="utf-8")

for file in FILES:
    p = Path(file)
    with out.open("a", encoding="utf-8") as f:
        f.write(f"\n\n==================== {file} ====================\n")
        if p.exists():
            text = p.read_text(encoding="utf-8", errors="replace")
            f.write(text)
        else:
            f.write("FILE NOT FOUND\n")

print("Created ai_demo_debug_small.txt")
