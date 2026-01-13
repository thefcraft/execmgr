use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct LastRunInfo {
    pub time: String,
    pub pid: u32
}

#[derive(Debug, Serialize, Deserialize)]
pub struct App {
    pub name: String,
    pub created_at: String,
    pub last_run: Option<LastRunInfo>,
    pub num_runs: u64,
}