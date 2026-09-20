import { useParams } from 'react-router-dom';
import { UserManager } from './UserManager';

export function UsersPage() {
  const { subTab } = useParams<{ subTab: string }>();
  const initialRole = subTab === 'salesmen' ? 'salesman' : 'all';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <UserManager initialRoleFilter={initialRole} />
    </div>
  );
}
