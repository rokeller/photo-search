FROM scratch

USER 1000:1000
WORKDIR /app
ENTRYPOINT [ "./embeddings" ]
EXPOSE 8082/tcp

COPY --link target/x86_64-unknown-linux-musl/release/embeddings /app
