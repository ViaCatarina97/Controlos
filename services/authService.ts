import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebaseService';

/**
 * Domínio interno usado para converter o "utilizador da unidade" num email
 * válido para o Firebase Auth. A equipa continua a autenticar-se com o mesmo
 * utilizador/palavra-passe; cada loja passa a ter a sua própria conta.
 */
const ACCOUNT_DOMAIN = 'controlos.app';

export function usernameToEmail(username: string): string {
  const slug = username
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 64);

  if (!slug) {
    throw new Error('Indique um utilizador da unidade válido (letras ou números).');
  }

  return `${slug}@${ACCOUNT_DOMAIN}`;
}

export function getCurrentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

export function subscribeToAuthState(listener: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, listener);
}

export async function signInWithStoreAccount(username: string, password: string): Promise<string> {
  const credential = await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  return credential.user.uid;
}

export async function createStoreAccount(username: string, password: string): Promise<string> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    usernameToEmail(username),
    password
  );
  return credential.user.uid;
}

export async function signOutStoreAccount(): Promise<void> {
  await signOut(auth);
}

export function describeAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Utilizador ou palavra-passe inválidos.';
    case 'auth/invalid-email':
      return 'Utilizador inválido. Use apenas letras, números e espaços.';
    case 'auth/email-already-in-use':
      return 'Este utilizador já está associado a uma unidade. Escolha outro nome de utilizador.';
    case 'auth/weak-password':
      return 'A palavra-passe tem de ter pelo menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'O acesso por utilizador/palavra-passe ainda não está ativo no Firebase (Authentication → Sign-in method → Email/Password).';
    case 'auth/too-many-requests':
      return 'Demasiadas tentativas falhadas. Aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Sem ligação à internet. Verifique a rede e tente novamente.';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'Sem permissões para os dados desta unidade. Confirme que a conta está associada à loja.';
    default:
      return error instanceof Error && error.message
        ? error.message
        : 'Não foi possível concluir a operação.';
  }
}
