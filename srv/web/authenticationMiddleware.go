package main

import (
	"context"
	"net/http"
	"regexp"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/golang/glog"
)

type authenticationMiddleware struct {
	expectedAud string
	expectedIss string

	tokenVerifier *oidc.IDTokenVerifier

	matcher *regexp.Regexp
}

func NewAuthenticationMiddleware(expectedAud, expectedIss string) authenticationMiddleware {
	return authenticationMiddleware{
		expectedAud: expectedAud,
		expectedIss: expectedIss,

		matcher: regexp.MustCompile(`^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$`),
	}.initialize()
}

func (m authenticationMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authentication := r.Header.Get("Authorization")

		captures := m.matcher.FindStringSubmatch(authentication)
		if nil == captures || len(captures) != 2 {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		tokenString := captures[1] // Group 1 captures the actual JWT

		ctx, cancelFunc := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancelFunc()

		token, err := m.tokenVerifier.Verify(ctx, tokenString)
		if nil != err {
			glog.Errorf("Failed to parse and verify token: %v", err)
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		glog.V(2).Infof("Authenticated subject: %s", token.Subject)

		next.ServeHTTP(w, r)
	})
}

func (m authenticationMiddleware) initialize() authenticationMiddleware {
	ctx, cancelFunc := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancelFunc()

	glog.V(1).Infof("Creating provider for issuer '%s' ...", m.expectedIss)
	provider, err := oidc.NewProvider(ctx, m.expectedIss)
	if nil != err {
		glog.Exitf("Failed to create new OIDC provider for '%s': %v", m.expectedIss, err)
	}

	glog.V(1).Infof("Creating verifier for issuer '%s' ...", m.expectedIss)
	m.tokenVerifier = provider.Verifier(&oidc.Config{
		SkipClientIDCheck: true,
	})
	glog.Infof("Creating authentication for issuer '%s' successfully initialized", m.expectedIss)

	return m
}
