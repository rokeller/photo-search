FROM scratch

USER 1000:1000
WORKDIR /app
ENTRYPOINT [ "./indexing" ]

COPY target/x86_64-unknown-linux-musl/release/indexing /app
