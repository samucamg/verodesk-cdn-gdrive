const AuthManager = {
    getToken: () => localStorage.getItem('UPLOAD_TOKEN'),
    setToken: (token) => localStorage.setItem('UPLOAD_TOKEN', token),
    logout: () => {
        localStorage.removeItem('UPLOAD_TOKEN');
        window.location.reload();
    },
    requireAuth: async function() {
        return new Promise((resolve) => {
            const token = this.getToken();
            if (token) return resolve(token);
            
            const modalHtml = `
                <div id="authModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;">
                    <div style="background:#fff;padding:2.5rem;border-radius:12px;max-width:400px;width:90%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                        <h2 style="margin-bottom:1rem;color:#1e3c72;font-family:sans-serif;">Acesso Restrito</h2>
                        <p style="margin-bottom:1.5rem;color:#6c757d;font-family:sans-serif;">Insira o token de seguranca para acessar o CDN.</p>
                        <input type="password" id="authTokenInput" style="width:100%;padding:1rem;margin-bottom:1.5rem;border:2px solid #e0e6ed;border-radius:8px;font-size:1rem;box-sizing:border-box;" placeholder="Token de Acesso">
                        <button id="authSubmitBtn" style="width:100%;padding:1rem;background:linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);color:#fff;border:none;border-radius:8px;font-size:1.1rem;font-weight:bold;cursor:pointer;">Autenticar</button>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const input = document.getElementById('authTokenInput');
            input.focus();
            
            const handleLogin = () => {
                const inputToken = input.value.trim();
                if(inputToken) {
                    this.setToken(inputToken);
                    document.getElementById('authModal').remove();
                    resolve(inputToken);
                }
            };

            document.getElementById('authSubmitBtn').addEventListener('click', handleLogin);
            input.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleLogin(); });
        });
    }
};
