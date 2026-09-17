use std::convert::Infallible;

use serde::Serialize;
use warp::{http::StatusCode, Rejection, Reply};

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

pub async fn handle_rejection(err: Rejection) -> std::result::Result<impl Reply, Infallible> {
    let code;
    let message;

    if err.is_not_found() {
        code = StatusCode::NOT_FOUND;
        message = "Not Found";
    } else if let Some(body_err) = err.find::<warp::filters::body::BodyDeserializeError>() {
        eprintln!("invalid body: {}", body_err);
        code = StatusCode::BAD_REQUEST;
        message = "Invalid Body";
    } else if err.find::<warp::reject::MethodNotAllowed>().is_some() {
        code = StatusCode::METHOD_NOT_ALLOWED;
        message = "Method Not Allowed";
    } else if err.find::<crate::handler::InvalidQueryError>().is_some() {
        code = StatusCode::BAD_REQUEST;
        message = "The query must not be empty or very large.";
    } else if let Some(server_err) = err.find::<crate::handler::ServerError>() {
        code = StatusCode::INTERNAL_SERVER_ERROR;
        message = server_err.message.as_str();
    } else {
        eprintln!("unhandled error: {:?}", err);
        code = StatusCode::INTERNAL_SERVER_ERROR;
        message = "Internal Server Error";
    }

    let json = warp::reply::json(&ErrorResponse {
        message: message.into(),
    });

    Ok(warp::reply::with_status(json, code))
}
