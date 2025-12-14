import pandas as pd
import re
import os
import ast 

def clean_price(price_str):
    if pd.isna(price_str) or price_str == '':
        return 0
    clean_str = re.sub(r'[^\d]', '', str(price_str))
    return int(clean_str) if clean_str else 0

def clean_area(area_str):
    if pd.isna(area_str) or area_str == '':
        return 0.0
    clean_str = re.sub(r'[^\d.]', '', str(area_str))
    try:
        return float(clean_str)
    except ValueError:
        return 0.0

def parse_images_from_csv(images_str):
    if pd.isna(images_str) or images_str == '':
        return []
    try:
        parsed = ast.literal_eval(str(images_str))
        if isinstance(parsed, list):
            return parsed
        return []
    except:
        return []

def main():
    # --- BAHAGIAN INI DAH DIBETULKAN ---
    input_file = 'rentals.csv'   # <--- Dia akan cari fail CSV awak
    output_json = 'cleaned_dataset.json'
    
    print(f"🔄 Membaca data dari {input_file}...")

    if not os.path.exists(input_file):
        print(f"❌ Error: Masih tak jumpa fail '{input_file}'!")
        print("   Pastikan ejaan nama fail sama dengan apa yang ada dalam folder.")
        return

    try:
        df = pd.read_csv(input_file) # <--- Guna read_csv
    except Exception as e:
        print(f"❌ Error membaca CSV: {e}")
        return

    print(f"📊 Data asal jumpa: {len(df)} baris")
    
    # 1. Fix Images
    if 'images' in df.columns:
        df['images'] = df['images'].apply(parse_images_from_csv)

    # 2. Fix Price
    if 'price' in df.columns:
        df['price'] = df['price'].apply(clean_price)

    # 3. Fix Area/Bed/Bath
    for col in ['area', 'bedrooms', 'bathrooms']:
        if col in df.columns:
            if col == 'area':
                df[col] = df[col].apply(clean_area)
            else:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    # 4. Filter
    df = df[df['price'] > 0]
    
    # 5. Simpan
    df.to_json(output_json, orient='records', indent=2)
    print(f"✅ SIAP! Data disimpan di: {output_json}")

if __name__ == "__main__":
    main()