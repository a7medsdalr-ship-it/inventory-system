import subprocess
import time
import re
import urllib.request

def start():
    while True:
        try:
            p = subprocess.Popen(
                ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=15", "-R", "80:localhost:8080", "nokey@localhost.run"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            for line in iter(p.stdout.readline, ''):
                print(line, end='', flush=True)
                match = re.search(r'(https://[a-zA-Z0-9\-\.]+\.lhr\.life)', line)
                if match:
                    url = match.group(1)
                    with open("C:/Users/ahmed/.gemini/antigravity/brain/78cbd3d0-ceea-4b81-90cf-c6bef8943cb6/current_url.txt", "w") as f:
                        f.write(url)
                    print(f"\n[ACTIVE_TUNNEL_URL]: {url}\n", flush=True)
                    try:
                        urllib.request.urlretrieve(f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={url}", "C:/Users/ahmed/.gemini/antigravity/brain/78cbd3d0-ceea-4b81-90cf-c6bef8943cb6/public_qr.png")
                    except Exception as e:
                        print("QR error:", e)
            p.wait()
        except Exception as err:
            print("Tunnel loop error:", err)
        time.sleep(2)

if __name__ == '__main__':
    start()
