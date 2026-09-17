use std::{
    convert::Infallible,
    net::SocketAddr,
    str::FromStr,
    sync::{Arc, Mutex},
};

use anyhow::Result;
use candle_core::Device;
use clap::Parser;
use warp::Filter;

mod embedding;
mod error;
mod handler;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(short, long, help = "Path to the model to use")]
    model_path: String,

    #[arg(
        short,
        long,
        default_value = "127.0.0.1:8082",
        help = "Binding to use for the server; supports IPv4 and IPv6, but does not support DNS names"
    )]
    binding: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    println!("Loading model from '{}'...", args.model_path);
    let device = Device::Cpu;
    let model = embedding::Model::new(device, args.model_path.as_str())?;
    println!("Model successfully loaded.");

    let health = warp::path!("_health");
    let embed = warp::path!("v1" / "embed");

    let health_routes = health.and(warp::get()).and_then(handler::health_handler);

    let embed_routes = embed
        .and(warp::post())
        .and(warp::body::form())
        .and(with_model(model))
        .and_then(handler::create_embedding_handler);

    let routes = health_routes
        .or(embed_routes)
        .recover(error::handle_rejection);

    println!("Starting server on {} ...", args.binding);
    let server_addr = SocketAddr::from_str(args.binding.as_str())?;
    warp::serve(routes).run(server_addr).await;

    Ok(())
}

fn with_model(
    model: embedding::Model,
) -> impl Filter<Extract = (Arc<Mutex<embedding::Model>>,), Error = Infallible> + Clone {
    let context = Arc::new(Mutex::new(model));
    warp::any().map(move || context.clone())
}
