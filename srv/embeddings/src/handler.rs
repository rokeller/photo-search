use std::sync::{Arc, Mutex};

use anyhow::Result;
use serde::{Deserialize, Serialize};
use warp::{
    reject::{self, Reject, Rejection},
    reply::json,
    Reply,
};

use crate::embedding;

pub async fn health_handler() -> Result<impl Reply, Rejection> {
    Ok(json(&HealthResponse {
        status: "healthy".to_string(),
    }))
}

pub async fn create_embedding_handler(
    body: CreateEmbeddingRequest,
    context: Arc<Mutex<embedding::Model>>,
) -> Result<impl Reply, Rejection> {
    if body.query.is_empty() {
        return Err(reject::custom(InvalidQueryError()));
    }

    let mut context = context.lock().unwrap();
    let now = std::time::Instant::now();
    let embedding = context.calc_embedding(body.query.as_str());
    let embedding = match embedding {
        Err(_) => {
            return Err(reject::custom(ServerError {
                message: "embedding calcuation failed".to_string(),
            }));
        }

        Ok(e) => e,
    };
    let elapsed = now.elapsed();
    println!("Handled query '{}' in {:.2?}", body.query, elapsed);

    Ok(json(&CreateEmbeddingResponse { v: embedding }))
}

// Request / Response

#[derive(Deserialize, Clone, PartialEq, Debug)]
pub struct CreateEmbeddingRequest {
    query: String,
}

#[derive(Serialize, PartialEq, Debug)]
pub struct CreateEmbeddingResponse {
    v: Vec<f32>,
}

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
}

// Errors

#[derive(Debug)]
pub struct InvalidQueryError();

impl Reject for InvalidQueryError {}

#[derive(Debug)]
pub struct ServerError {
    pub message: String,
}

impl Reject for ServerError {}
