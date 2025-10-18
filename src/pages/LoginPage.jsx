import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await login(username, password);
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((d) => {
              if (d.loc && d.msg) {
                return `${d.loc.slice(1).join('.')}: ${d.msg}`;
              }
              return d.msg || 'Unknown error';
            })
            .join('; '),
        );
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Unknown error');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <form className="bg-white p-6 rounded-2xl shadow-lg w-80 space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-xl font-semibold text-center">Вход</h2>

        {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm mb-2">{error}</div>}

        <input
          className="border p-2 rounded w-full"
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="border p-2 rounded w-full"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700"
          type="submit"
        >
          Войти
        </button>

        <button
          type="button"
          className="text-sm text-gray-600 underline mt-2 w-full"
          onClick={() => navigate('/register')}
        >
          Нет аккаунта? Зарегистрироваться
        </button>
      </form>
    </div>
  );
}
