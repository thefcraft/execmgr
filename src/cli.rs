use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "execmgr")]
#[command(about = "Execution manager for local apps/services")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// show app info
    #[command(alias = "about")]
    Info,

    /// Create a new app or service
    Create { name: String },
    /// List apps
    #[command(alias = "ls")]
    List {
        /// Show detailed output
        #[arg(short = 'l', long)]
        long: bool,
        /// no truncation in output
        #[arg(short = 'f', long)]
        full: bool,
    },
    /// Show running apps (ps)
    Ps {
        /// Show full process info
        #[arg(short = 'l', long)]
        long: bool,
        /// no truncation in output
        #[arg(short = 'f', long)]
        full: bool,
    },
    /// Run an app
    Run { name: String },

    /// View Status of an app
    Status { name: String },

    /// Stop an app using stop.sh
    Stop { 
        name: String,

        /// force run stop.sh
        #[arg(short = 'f', long)]
        force: bool,
    },

    /// Kill an app using pid
    Kill { name: String },

    /// Delete an app
    #[command(alias = "rm")]
    Delete {
        name: String,

        /// Skip confirmation
        #[arg(short = 'f', long)]
        force: bool,
    },

    /// see an app logs
    Log {
        /// App name
        name: String,

        /// Clear logs instead of showing
        #[arg(short = 'c', long)]
        clear: bool,

        /// Clear stdout logs
        #[arg(long, requires = "clear")]
        stdout: bool,

        /// Clear / show stderr logs
        #[arg(long)]
        stderr: bool,

        /// Follow logs (like tail -f)
        #[arg(short = 'f', long, conflicts_with = "clear")]
        follow: bool,
    },
}
