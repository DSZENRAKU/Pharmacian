import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from drug_interaction import get_multiple_interactions

def test_interactions():
    print("Testing Aspirin + Warfarin...")
    warnings = get_multiple_interactions(["Aspirin", "Warfarin"])
    for w in warnings:
        print(f"[{w['severity']}] {w['type']}: {w['note']}")
    
    print("\nTesting Ibuprofen + Aspirin...")
    warnings = get_multiple_interactions(["Ibuprofen", "Aspirin"])
    for w in warnings:
        print(f"[{w['severity']}] {w['type']}: {w['note']}")

    print("\nTesting single drug (FDA Lookup): Lisinopril")
    warnings = get_multiple_interactions(["Lisinopril"])
    if warnings:
        print(f"Found {len(warnings)} potential warnings in FDA records.")
        print(f"Example: [{warnings[0]['severity']}] {warnings[0]['type']}")
    else:
        print("No warnings found for Lisinopril (or API error).")

if __name__ == "__main__":
    test_interactions()
