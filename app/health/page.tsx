// src/app/ajuda/health/page.tsx

export default function HealthCheckPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1c1c1c',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', color: '#22c55e' }}>✅ Proxy Reverso Funcionando!</h1>
      <p style={{ marginTop: '1rem', fontSize: '1.2rem', maxWidth: '600px' }}>
        Se você está vendo esta página, significa que o seu servidor Nginx está conseguindo se comunicar corretamente com a aplicação na Vercel através do subdiretório <strong>/ajuda</strong>.
      </p>
      <p style={{ marginTop: '2rem', color: '#a1a1aa' }}>
        Agora podemos focar em depurar a autenticação.
      </p>
    </div>
  );
}