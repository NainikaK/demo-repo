import { useEffect, useState } from 'react';
import { USERS_URL } from '../utils/constants';

interface UseAssignableUsersResult {
  users: string[];
  loading: boolean;
  error: string | null;
}

export function useAssignableUsers(): UseAssignableUsersResult {
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(USERS_URL);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data: string[] = await response.json();
        if (!cancelled) {
          setUsers(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  return { users, loading, error };
}
