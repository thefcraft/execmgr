import axios from "axios";

// Dynamically use browser's hostname to communicate with API server on port 8000
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`,
});

export type ApiState<T, E> = {
    loading?: boolean;
    error?: E;
    data?: T;
};

export interface SystemInfo {
    basedir: string;
    apps: number;
    running: number;
    binary_path: string;
    rustCrate: string;
    version: string;
}

export async function fetchSystemInfo() {
    const { data } = await api.get<SystemInfo>("/system-info");
    return data;
}

export interface AppInfo {
    name: string;
    path: string;
    pid: number | null;
    runs: number;
    uptime: number | null;
    created: string;
    lastRun: string | null;
    running: boolean;
}

export async function fetchAppsInfo() {
    const { data } = await api.get<AppInfo[]>("/apps-info");
    return data;
}

export async function createApp(name: string) {
    const { data } = await api.post<AppInfo>("/create-app", { name });
    return data;
}

export async function runApp(name: string) {
    const { data } = await api.post<{ message: string; pid: number; started_at: string }>(`/apps/${name}/run`);
    return data;
}

export interface StopResponse {
    exit_code: number;
    stdout: string;
    stderr: string;
}

export async function stopApp(name: string, force = false) {
    const { data } = await api.post<StopResponse>(`/apps/${name}/stop?force=${force}`);
    return data;
}

export async function killApp(name: string) {
    const { data } = await api.post<{ message: string }>(`/apps/${name}/kill`);
    return data;
}

export async function deleteApp(name: string) {
    const { data } = await api.delete(`/apps/${name}`);
    return data;
}

export async function renameApp(name: string, newName: string) {
    const { data } = await api.post<{ message: string }>(`/apps/${name}/rename`, { newName });
    return data;
}

export interface ScriptsInfo {
    startScript: string;
    stopScript: string;
}

export async function fetchScripts(name: string) {
    const { data } = await api.get<ScriptsInfo>(`/apps/${name}/scripts`);
    return data;
}

export async function saveScripts(name: string, startScript: string, stopScript: string) {
    const { data } = await api.put(`/apps/${name}/scripts`, { startScript, stopScript });
    return data;
}

export interface LogsInfo {
    stdout: string[];
    stderr: string[];
}

export async function fetchLogs(name: string) {
    const { data } = await api.get<LogsInfo>(`/apps/${name}/logs`);
    return data;
}

export async function clearLogs(name: string) {
    const { data } = await api.post(`/apps/${name}/logs/clear`);
    return data;
}

export async function openFolder(name: string) {
    const { data } = await api.post(`/apps/${name}/open`);
    return data;
}

export function getLogsStreamUrl(name: string, type: "stdout" | "stderr"): string {
    const base = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;
    return `${base}/apps/${name}/logs/stream?type=${type}`;
}

export function getEventsStreamUrl(): string {
    const base = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;
    return `${base}/events`;
}